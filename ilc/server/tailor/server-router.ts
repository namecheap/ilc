import deepmerge from 'deepmerge';

import { RouterError } from '../../common/router/errors';
import { Router } from '../../common/router/Router';
import { makeAppId } from '../../common/utils';
import type { Slot } from '../../common/types/Router';
import type { App } from '../types/RegistryConfig';
import type { TransformedRegistryConfig } from '../types/Registry';
import type { IlcState, PatchedHttpRequest } from '../types/PatchedHttpRequest';

/**
 * The wrapper half of a slot's SSR context. Exported because request-fragment consumes it: one
 * definition, so producer and consumer cannot drift.
 *
 * `src` is optional on purpose — it is spread from `App['ssr']`, where it is optional, and a
 * wrapper declaring `ssr: {}` reaches here. The consumer is responsible for rejecting that.
 */
export interface WrapperConf {
    appId: string;
    name: string;
    props?: Record<string, unknown>;
    /**
     * A wrapped slot is filled client-side by loading BOTH bundles and combining them
     * (registerSpaApps -> wrapper.wrapWith), so the size guard needs the wrapper's URL
     * alongside the wrapped app's. spaBundle sits outside `ssr`, so the spread does not
     * carry it and it is copied across explicitly.
     */
    spaBundleUrl?: string;
    src?: string;
    timeout?: number;
    ignoreInvalidSsl?: boolean;
}

interface SsrSlot extends Slot {
    name: string;
    appId: string;
    appInfo: App;
    wrapperConf: WrapperConf | null;
}

/**
 * The per-fragment context tailor receives from this router. It is NOT the same shape
 * request-fragment sees: the pipeline is
 *
 *   FragmentContext (here)  ->  attributes on the <fragment> tag  ->  camel-cased by tailor
 *   ->  FragmentAttributes (request-fragment.ts)
 *
 * Two consequences that look like bugs if you read either file alone. `ignore-invalid-ssl` is
 * hyphenated here and read as `ignoreInvalidSsl` there, because tailor camel-cases tag
 * attributes in between. And `id` never appears here — it reaches the consumer from the
 * `id="..."` attribute that getFragmentsTpl() writes into the template.
 */
interface FragmentContext {
    src?: string;
    timeout?: number;
    'ignore-invalid-ssl'?: boolean;
    primary?: boolean;
    appProps?: Record<string, unknown>;
    wrapperConf: WrapperConf | null;
    spaBundleUrl?: string;
}

type Logger = Pick<Console, 'debug' | 'warn'>;

/**
 * Only the two fields this router reads off the request. Declaring that rather than the whole
 * PatchedHttpRequest keeps the dependency honest, and lets callers — tests included — pass
 * exactly what it needs.
 */
interface RouterRequest {
    registryConfig?: TransformedRegistryConfig;
    ilcState?: IlcState;
}

export class ServerRouter {
    private logger: Logger;
    private request: RouterRequest;
    private registryConfig?: TransformedRegistryConfig;
    private url: string;
    private router: Router | null = null;

    constructor(logger: Logger, request: RouterRequest, url: string) {
        this.logger = logger;
        this.request = request;
        this.registryConfig = request.registryConfig;
        this.url = url;
    }

    getFragmentsTpl(): string {
        const route = this.getRoute();

        const fragmentsTpl = this.getSsrSlotsList(route.slots, this.apps()).reduce(
            (res, row) => res + `<fragment id="${row.appId}" slot="${row.name}"></fragment>`,
            '',
        );

        this.logger.debug({ detailsJSON: JSON.stringify({ fragmentsTpl }) }, 'getFragmentsTpl');

        return fragmentsTpl;
    }

    getFragmentsContext(): Record<string, FragmentContext> {
        const route = this.getRoute();
        const apps = this.apps();
        let primarySlotDetected = false;

        const fragmentsContext = this.getSsrSlotsList(route.slots, apps).reduce<Record<string, FragmentContext>>(
            (res, row) => {
                const { appId, appInfo } = row;

                const ssr = appInfo.ssr;

                if (!ssr?.src || typeof ssr.src !== 'string') {
                    throw new RouterError({ message: 'No url specified for fragment!', data: { appInfo } });
                }

                const fragmentContext: FragmentContext = {
                    src: ssr.src,
                    timeout: ssr.timeout,
                    wrapperConf: row.wrapperConf,
                };

                if (ssr.ignoreInvalidSsl === true) {
                    fragmentContext['ignore-invalid-ssl'] = true;
                }

                const fragmentKind = row.kind || appInfo.kind;

                if (fragmentKind === 'primary' && primarySlotDetected === false) {
                    fragmentContext.primary = true;
                    primarySlotDetected = true;
                } else if (fragmentKind === 'primary') {
                    this.logger.warn(
                        `More then one primary slot "${row.name}" found for "${this.url}".\n` +
                            'Make it regular to avoid unexpected behaviour.',
                    );
                }

                const ilcState = this.getIlcState();
                // Nest experiments inside an `appProps` sub-field — that's where a client
                // consumer reads user-app props from `requestData.getCurrentPathProps().appProps`.
                // The outer object also carries `appConfig` (registry-defined infra config) as a sibling.
                const experimentsProps = ilcState.experiments
                    ? { appProps: { experiments: ilcState.experiments } }
                    : {};

                fragmentContext.appProps = deepmerge.all([
                    appInfo.props || {},
                    appInfo.ssrProps || {},
                    row.props || {},
                    experimentsProps,
                ]) as Record<string, unknown>;
                fragmentContext.spaBundleUrl = appInfo.spaBundle;

                res[appId] = fragmentContext;

                return res;
            },
            {},
        );

        this.logger.debug({ detailsJSON: JSON.stringify({ fragmentsContext }) }, 'getFragmentsContext');

        return fragmentsContext;
    }

    getRoute() {
        if (this.router === null) {
            if (!this.registryConfig) {
                // Router destructures routes straight away, so this threw a TypeError before.
                // Saying which precondition failed is strictly more useful.
                throw new RouterError({ message: 'Registry config is required to match a route' });
            }

            this.router = new Router(this.registryConfig);
        }

        const ilcState = this.getIlcState();

        // IlcState types forceSpecialRoute as a string, but Router.matchSpecial takes a numeric
        // route id and callers set 404 as a number. Converting here keeps both honest.
        return ilcState.forceSpecialRoute
            ? this.router.matchSpecial(this.url, Number(ilcState.forceSpecialRoute))
            : this.router.match(this.url);
    }

    private apps(): Record<string, App> {
        return this.registryConfig?.apps ?? {};
    }

    private getSsrSlotsList = (routeSlots: Record<string, Slot> | undefined, apps: Record<string, App>): SsrSlot[] =>
        Object.entries(routeSlots ?? {}).reduce<SsrSlot[]>((res, [slotName, slotData]) => {
            const appName = slotData.appName;
            const appId = makeAppId(appName, slotName);
            const appInfo = apps[appName];

            if (appInfo === undefined) {
                throw new RouterError({ message: "Can't find info about app.", data: { appName } });
            }
            if (appInfo.ssr === undefined) {
                return res;
            }

            let wrapperConf: WrapperConf | null = null;

            if (appInfo.wrappedWith) {
                const wrapper = apps[appInfo.wrappedWith];

                if (wrapper.ssr === undefined) {
                    // If wrapper doesn't support SSR - it will be disabled for all wrapped apps
                    return res;
                }

                wrapperConf = {
                    appId: makeAppId(appInfo.wrappedWith, slotName),
                    name: appInfo.wrappedWith,
                    ...wrapper.ssr,
                    props: wrapper.props,
                    spaBundleUrl: wrapper.spaBundle,
                };
            }

            res.push({ name: slotName, ...slotData, appId, appInfo, wrapperConf });

            return res;
        }, []);

    private getIlcState = (): IlcState => this.request.ilcState || {};
}
