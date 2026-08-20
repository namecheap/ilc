import _ from 'lodash';
import deepmerge from 'deepmerge';
import type { Logger } from 'ilc-plugins-sdk';

import { RouterError } from '../../common/router/errors';
import { Router } from '../../common/router/Router';
import { makeAppId } from '../../common/utils';
import type { Slot, RouterMatch } from '../../common/types/Router';
import type { App } from '../types/RegistryConfig';
import type { TransformedRegistryConfig } from '../types/Registry';
import type { IlcState, PatchedHttpRequest } from '../types/PatchedHttpRequest';
import type { FragmentWrapperConf } from './fragment-attributes';

interface SsrSlotRow extends Slot {
    name: string;
    appId: string;
    appInfo: App;
    wrapperConf: FragmentWrapperConf | null;
}

interface SsrOpts {
    src?: string;
    timeout?: number;
    'ignore-invalid-ssl'?: true;
    cache?: { enabled?: boolean; ttlSeconds?: number };
    primary?: true;
    appProps: Record<string, unknown>;
    wrapperConf: FragmentWrapperConf | null;
    spaBundleUrl?: string;
}

export default class ServerRouter {
    private logger: Logger;
    private request: PatchedHttpRequest;
    private registryConfig: TransformedRegistryConfig;
    private url: string;
    private router: Router | null = null;

    constructor(logger: Logger, request: PatchedHttpRequest, url: string) {
        this.logger = logger;
        this.request = request;
        this.registryConfig = request.registryConfig as TransformedRegistryConfig;
        this.url = url;
    }

    getFragmentsTpl(): string {
        const route = this.getRoute();

        const fragmentsTpl = _.reduce(
            this.getSsrSlotsList(route.slots, this.registryConfig.apps),
            (res, row) => {
                return res + `<fragment id="${row.appId}" slot="${row.name}"></fragment>`;
            },
            '',
        );

        this.logger.debug(
            {
                detailsJSON: JSON.stringify({
                    fragmentsTpl,
                }),
            },
            'getFragmentsTpl',
        );

        return fragmentsTpl;
    }

    getFragmentsContext(): Record<string, SsrOpts> {
        const route = this.getRoute();
        const apps = this.registryConfig.apps;
        let primarySlotDetected = false;

        const fragmentsContext = _.reduce(
            this.getSsrSlotsList(route.slots, apps),
            (res: Record<string, SsrOpts>, row) => {
                const appId = row.appId;
                const appInfo = row.appInfo;

                const ssr = _.pick(row.appInfo.ssr, ['src', 'timeout', 'ignoreInvalidSsl', 'cache']);
                if (!ssr.src || typeof ssr.src !== 'string') {
                    throw new RouterError({ message: 'No url specified for fragment!', data: { appInfo } });
                }

                const fragmentKind = row.kind || appInfo.kind;
                const isPrimary = fragmentKind === 'primary' && primarySlotDetected === false;
                if (isPrimary) {
                    primarySlotDetected = true;
                } else if (fragmentKind === 'primary') {
                    this.logger.warn(
                        `More then one primary slot "${row.name}" found for "${this.url}".\n` +
                            'Make it regular to avoid unexpected behaviour.',
                    );
                }

                const ilcState = this.getIlcState();
                // Nested in appProps: the client reads it via getCurrentPathProps().appProps,
                // alongside the sibling appConfig (registry-defined infra config).
                const experimentsProps = ilcState.experiments
                    ? { appProps: { experiments: ilcState.experiments } }
                    : {};

                const ssrOpts: SsrOpts = {
                    src: ssr.src,
                    ...(ssr.timeout !== undefined ? { timeout: ssr.timeout } : {}),
                    ...(ssr.cache !== undefined ? { cache: ssr.cache } : {}),
                    ...(ssr.ignoreInvalidSsl === true ? { 'ignore-invalid-ssl': true as const } : {}),
                    ...(isPrimary ? { primary: true as const } : {}),
                    appProps: deepmerge.all<Record<string, unknown>>([
                        appInfo.props || {},
                        appInfo.ssrProps || {},
                        row.props || {},
                        experimentsProps,
                    ]),
                    wrapperConf: row.wrapperConf,
                    spaBundleUrl: appInfo.spaBundle,
                };

                res[appId] = ssrOpts;

                return res;
            },
            {} as Record<string, SsrOpts>,
        );

        this.logger.debug(
            {
                detailsJSON: JSON.stringify({
                    fragmentsContext,
                }),
            },
            'getFragmentsContext',
        );

        return fragmentsContext;
    }

    getRoute(): RouterMatch {
        if (this.router === null) {
            this.router = new Router(this.registryConfig);
        }

        const ilcState = this.getIlcState();

        if (ilcState.forceSpecialRoute) {
            return this.router.matchSpecial(this.url, Number(ilcState.forceSpecialRoute));
        } else {
            return this.router.match(this.url);
        }
    }

    private getSsrSlotsList = (routeSlots: Record<string, Slot>, apps: Record<string, App>): SsrSlotRow[] =>
        _.reduce(
            routeSlots,
            (res: SsrSlotRow[], slotData, slotName) => {
                let appName = slotData.appName;
                const appId = makeAppId(appName, slotName);
                const appInfo = apps[appName];

                if (appInfo === undefined) {
                    throw new RouterError({ message: "Can't find info about app.", data: { appName } });
                }
                if (appInfo.ssr === undefined) {
                    return res;
                }

                let wrapperConf: FragmentWrapperConf | null = null;
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
                        // Registry validation requires src+timeout together whenever ssr is set
                        src: wrapper.ssr.src as string,
                        props: wrapper.props,
                    };
                }

                res.push({
                    name: slotName,
                    ...slotData,
                    appId,
                    appInfo,
                    wrapperConf,
                });

                return res;
            },
            [] as SsrSlotRow[],
        );

    private getIlcState = (): IlcState => this.request.ilcState || {};
}
