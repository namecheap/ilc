import urlJoin from 'url-join';
import { RoutingStrategy, type IntlAdapterConfig } from 'ilc-sdk/app';
import type { RouterMatch } from '../../common/types/Router';
import { appIdToNameAndSlot, encodeHtmlEntities, uniqueArray } from '../../common/utils';
import { HrefLangService } from '../services/HrefLangService';
import { CanonicalTagService } from '../services/CanonicalTagService';
import type { PatchedHttpRequest } from '../types/PatchedHttpRequest';
import type { Template, TransformedRegistryConfig, TransformedSpecialRoute } from '../types/Registry';
import type { App as RegistryApp } from '../types/RegistryConfig';

type ConfigsInjectorRequest = PatchedHttpRequest & {
    registryConfig: TransformedRegistryConfig;
    scriptRefs?: string[];
    styleRefs?: string[];
};

type BrowserTimingHeaderProvider = {
    getBrowserTimingHeader(): string;
};

type FragmentPreloadContext = Record<string, FragmentContextEntry>;

type FragmentContextEntry = {
    spaBundleUrl?: string;
    wrapperConf?: {
        name?: string;
    } | null;
};

type InjectRoute = Pick<RouterMatch, 'meta' | 'reqUrl' | 'slots'>;

type PreloadAssets = {
    scriptRefs: string[];
    styleRefs: string[] | undefined;
};

type RouteAssets = {
    stylesheetLinks: string[];
};

export class ConfigsInjector {
    private readonly cdnUrl: string | null;
    private readonly cssInjectionPlaceholder = '<!-- ILC_CSS -->';
    private readonly jsInjectionPlaceholder = '<!-- ILC_JS -->';
    private readonly markedProdTags = /<!-- Prod only start -->.*?<!-- Prod only end -->/gims;
    private readonly newrelic: BrowserTimingHeaderProvider;
    private readonly nrAutomaticallyInjectClientScript: boolean;
    private readonly nrCustomClientJsWrapper: string | null;

    constructor(
        newrelic: BrowserTimingHeaderProvider,
        cdnUrl: string | null = null,
        nrCustomClientJsWrapper: string | null = null,
        nrAutomaticallyInjectClientScript = true,
    ) {
        this.newrelic = newrelic;
        this.cdnUrl = cdnUrl;
        this.nrCustomClientJsWrapper = nrCustomClientJsWrapper;
        this.nrAutomaticallyInjectClientScript = nrAutomaticallyInjectClientScript;
    }

    inject(request: ConfigsInjectorRequest, template: Template, route: InjectRoute): string {
        let document = template.content;

        if (typeof document !== 'string') {
            throw new Error(`Can't inject ILC configs into invalid document.`);
        }

        const registryConfig = request.registryConfig;
        const { reqUrl: url, slots } = route;
        const i18nConfig = this.getIntlAdapterConfig(registryConfig.settings.i18n);
        const locale = request.ilcState?.locale ?? i18nConfig?.default.locale;

        if (request.ilcState?.locale) {
            document = document.replace('<html', `<html lang="${request.ilcState.locale}"`);
            delete request.ilcState.locale;
        }

        const routeAssets = this.getRouteAssets(registryConfig.apps, slots);
        const ilcCss = this.wrapWithIgnoreDuringParsing(...routeAssets.stylesheetLinks);

        if (document.includes(this.cssInjectionPlaceholder)) {
            document = document.replace(this.cssInjectionPlaceholder, ilcCss);
        } else {
            document = document.replace('</head>', `${ilcCss}</head>`);
        }

        const hrefLangService = new HrefLangService(i18nConfig);
        const hrefLangHtml = hrefLangService.getHrefLangsForUrlAsHTML(url);
        const canonicalTagHtml = i18nConfig
            ? CanonicalTagService.getCanonicalTagForUrlAsHTML(
                  url,
                  locale,
                  i18nConfig,
                  route.meta,
                  registryConfig.canonicalDomain,
              )
            : '';

        const headHtmlContent = this.wrapWithIgnoreDuringParsing(
            this.getIlcState(request),
            this.getSPAConfig(registryConfig),
            '<script>window.ilcApps = [];</script>',
            this.wrapWithAsyncScriptTag(this.getClientjsUrl()),
            this.getNewRelicScript(),
            hrefLangHtml,
            canonicalTagHtml,
        );

        if (document.includes(this.jsInjectionPlaceholder)) {
            document = document.replace(this.jsInjectionPlaceholder, headHtmlContent);
        } else {
            document = document.replace('</head>', `${headHtmlContent}</head>`);
        }

        request.styleRefs = this.getRouteStyleRefsToPreload(registryConfig.apps, slots, template.styleRefs);

        const fragmentsContext: FragmentPreloadContext = request.router ? request.router.getFragmentsContext() : {};
        request.scriptRefs = this.getSsrFragmentScriptRefsToPreload(fragmentsContext, registryConfig.apps);

        if (request.ldeRelated) {
            document = this.removeProdTags(document);
        }

        return document;
    }

    getAssetsToPreload = async (request: ConfigsInjectorRequest): Promise<PreloadAssets> => {
        return {
            scriptRefs: request.scriptRefs ?? [],
            styleRefs: request.styleRefs,
        };
    };

    private getSsrFragmentScriptRefsToPreload(
        fragmentsContext: FragmentPreloadContext,
        apps: Record<string, RegistryApp>,
    ): string[] {
        const scriptRefs: string[] = [];

        for (const [appId, fragmentContext] of Object.entries(fragmentsContext)) {
            const appInfo = this.getAppByFragmentId(apps, appId);

            if (fragmentContext.spaBundleUrl && this.shouldPreloadSpaBundle(appInfo)) {
                scriptRefs.push(fragmentContext.spaBundleUrl);
            }

            const wrapperAppName = fragmentContext.wrapperConf?.name;
            const wrapperBundle =
                wrapperAppName && this.shouldPreloadSpaBundle(apps[wrapperAppName])
                    ? apps[wrapperAppName]?.spaBundle
                    : undefined;

            if (wrapperBundle) {
                scriptRefs.push(wrapperBundle);
            }
        }

        return uniqueArray(scriptRefs);
    }

    private getRouteStyleRefsToPreload(
        apps: Record<string, RegistryApp>,
        slots: InjectRoute['slots'],
        templateStyleRefs: string[],
    ): string[] {
        const routeStyleRefs: string[] = [];

        for (const slotData of Object.values(slots)) {
            const appInfo = apps[slotData.appName];
            const cssBundle = this.shouldPreloadCssBundle(appInfo) ? appInfo?.cssBundle : undefined;

            if (cssBundle && !routeStyleRefs.includes(cssBundle)) {
                routeStyleRefs.push(cssBundle);
            }
        }

        return uniqueArray(routeStyleRefs.concat(templateStyleRefs));
    }

    private getRouteAssets(apps: Record<string, RegistryApp>, slots: InjectRoute['slots']) {
        const routeAssets: RouteAssets = {
            stylesheetLinks: [],
        };

        for (const slotData of Object.values(slots)) {
            const appInfo = apps[slotData.appName];

            if (!appInfo) {
                continue;
            }

            if (
                appInfo.cssBundle &&
                !routeAssets.stylesheetLinks.some((stylesheetLink) => stylesheetLink.includes(appInfo.cssBundle!))
            ) {
                routeAssets.stylesheetLinks.push(
                    this.wrapWithFragmentStylesheetLink(appInfo.cssBundle, slotData.appName),
                );
            }
        }

        return {
            stylesheetLinks: routeAssets.stylesheetLinks,
        };
    }

    private getClientjsUrl(): string {
        return this.cdnUrl === null ? '/_ilc/client.js' : urlJoin(this.cdnUrl, '/client.js');
    }

    private getSPAConfig(registryConfig: TransformedRegistryConfig): string {
        const apps = Object.fromEntries(
            Object.entries(registryConfig.apps).map(([appName, appConfig]) => [
                appName,
                {
                    spaBundle: appConfig.spaBundle,
                    cssBundle: appConfig.cssBundle,
                    dependencies: appConfig.dependencies,
                    props: appConfig.props,
                    kind: appConfig.kind,
                    wrappedWith: appConfig.wrappedWith,
                    l10nManifest: appConfig.l10nManifest,
                },
            ]),
        );

        let settings = registryConfig.settings;
        const customHTML = registryConfig.settings.globalSpinner?.customHTML;

        if (customHTML) {
            settings = {
                ...registryConfig.settings,
                globalSpinner: {
                    ...registryConfig.settings.globalSpinner,
                    customHTML: encodeHtmlEntities(customHTML),
                },
            };
        }

        const routes = registryConfig.routes.map((route) => {
            const { routeId, ...routeWithoutId } = route;
            return routeWithoutId;
        });

        const specialRoutes = Object.fromEntries(
            Object.entries(registryConfig.specialRoutes).map(([specialRouteKey, specialRoute]) => [
                specialRouteKey,
                this.omitRouteId(specialRoute),
            ]),
        );

        const spaConfig = JSON.stringify({
            apps,
            routes,
            specialRoutes,
            settings,
            sharedLibs: registryConfig.sharedLibs,
            dynamicLibs: registryConfig.dynamicLibs,
            canonicalDomain: registryConfig.canonicalDomain,
        });

        return `<script type="text/ilc-config">${spaConfig}</script>`;
    }

    private getIlcState(request: ConfigsInjectorRequest): string {
        const state = request.ilcState ?? {};

        if (Object.keys(state).length === 0) {
            return '';
        }

        return `<script type="ilc-state">${JSON.stringify(state)}</script>`;
    }

    private wrapWithAsyncScriptTag(url: string): string {
        return `<script src="${url}" type="text/javascript" ${this.getCrossoriginAttribute(url)} async></script>`;
    }

    private wrapWithFragmentStylesheetLink(url: string, fragmentId: string): string {
        return `<link rel="stylesheet" href="${url}" data-fragment-id="${fragmentId}">`;
    }

    private getCrossoriginAttribute(url: string): string {
        return (this.cdnUrl !== null && url.includes(this.cdnUrl)) || url.includes('://') ? 'crossorigin' : '';
    }

    private wrapWithIgnoreDuringParsing(...content: string[]): string {
        return `<!-- TailorX: Ignore during parsing START -->${content.join('')}<!-- TailorX: Ignore during parsing END -->`;
    }

    private getNewRelicScript(): string {
        if (!this.nrAutomaticallyInjectClientScript) {
            return '';
        }

        let nrCode = this.newrelic.getBrowserTimingHeader();

        if (this.nrCustomClientJsWrapper === null || !nrCode) {
            return nrCode;
        }

        nrCode = nrCode.replace(/<script.*?>(.*)<\/script\s*>/s, '$1');
        return this.nrCustomClientJsWrapper.replace('%CONTENT%', nrCode);
    }

    private removeProdTags(content: string): string {
        return content.replace(this.markedProdTags, '');
    }

    private omitRouteId(route: TransformedSpecialRoute): Omit<TransformedSpecialRoute, 'routeId'> {
        const { routeId, ...routeWithoutId } = route;
        return routeWithoutId;
    }

    private getIntlAdapterConfig(
        i18nConfig: TransformedRegistryConfig['settings']['i18n'],
    ): IntlAdapterConfig | undefined {
        const routingStrategy = i18nConfig?.routingStrategy;

        if (
            !i18nConfig ||
            typeof i18nConfig.default?.locale !== 'string' ||
            typeof i18nConfig.default?.currency !== 'string' ||
            !Array.isArray(i18nConfig.supported?.locale) ||
            !Array.isArray(i18nConfig.supported?.currency) ||
            (routingStrategy !== RoutingStrategy.Prefix && routingStrategy !== RoutingStrategy.PrefixExceptDefault)
        ) {
            return undefined;
        }

        return {
            default: {
                currency: i18nConfig.default.currency,
                locale: i18nConfig.default.locale,
            },
            routingStrategy,
            supported: {
                currency: i18nConfig.supported.currency,
                locale: i18nConfig.supported.locale,
            },
        };
    }

    private shouldPreloadSpaBundle(appInfo?: RegistryApp): boolean {
        return appInfo?.discoveryMetadata?.preloadSpaBundle === true;
    }

    private shouldPreloadCssBundle(appInfo?: RegistryApp): boolean {
        return appInfo?.discoveryMetadata?.preloadCssBundle !== false;
    }

    private getAppByFragmentId(apps: Record<string, RegistryApp>, appId: string): RegistryApp | undefined {
        const { appName } = appIdToNameAndSlot(appId);

        return apps[appName] ?? apps[appName.replace(/^@portal\//, '')];
    }
}
