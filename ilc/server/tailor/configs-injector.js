const _ = require('lodash');
const urljoin = require('url-join');
const { uniqueArray, encodeHtmlEntities } = require('../../common/utils');
const { HrefLangService } = require('../services/HrefLangService');
const { CanonicalTagService } = require('../services/CanonicalTagService');

module.exports = class ConfigsInjector {
    #newrelic;
    #nrCustomClientJsWrapper;
    #nrAutomaticallyInjectClientScript;
    #cdnUrl;
    #jsInjectionPlaceholder = '<!-- ILC_JS -->';
    #cssInjectionPlaceholder = '<!-- ILC_CSS -->';
    #markedProdTags = /<!-- Prod only start -->.*?<!-- Prod only end -->/gims;

    constructor(newrelic, cdnUrl = null, nrCustomClientJsWrapper = null, nrAutomaticallyInjectClientScript = true) {
        this.#newrelic = newrelic;
        this.#cdnUrl = cdnUrl;
        this.#nrCustomClientJsWrapper = nrCustomClientJsWrapper;
        this.#nrAutomaticallyInjectClientScript = nrAutomaticallyInjectClientScript;
    }

    inject(request, template, route) {
        const registryConfig = request.registryConfig;
        const { slots, reqUrl: url } = route;
        const locale = request.ilcState?.locale || registryConfig.settings?.i18n?.default?.locale;

        let document = template.content;

        if (typeof document !== 'string') {
            throw new Error(`Can't inject ILC configs into invalid document.`);
        }

        if (request.ilcState && request.ilcState.locale) {
            document = document.replace('<html', `<html lang="${request.ilcState.locale}"`);
            delete request.ilcState.locale; // We don't need it at client side
        }

        const routeAssets = this.#getRouteAssets(registryConfig.apps, slots);

        const ilcCss = this.#wrapWithIgnoreDuringParsing(...routeAssets.stylesheetLinks);

        if (document.includes(this.#cssInjectionPlaceholder)) {
            document = document.replace(this.#cssInjectionPlaceholder, ilcCss);
        } else {
            document = document.replace('</head>', ilcCss + '</head>');
        }

        const hrefLangService = new HrefLangService(registryConfig.settings?.i18n);

        const hrefLangHtml = hrefLangService.getHrefLangsForUrlAsHTML(url);
        const canonicalTagHtml = CanonicalTagService.getCanonicalTagForUrlAsHTML(
            url,
            locale,
            registryConfig.settings?.i18n,
            route.meta,
        );

        const headHtmlContent = this.#wrapWithIgnoreDuringParsing(
            //...routeAssets.scriptLinks,
            this.#getIlcState(request),
            this.#getSPAConfig(registryConfig),
            `<script>window.ilcApps = [];</script>`,
            this.#wrapWithAsyncScriptTag(this.#getClientjsUrl()),
            this.#getNewRelicScript(),
            hrefLangHtml,
            canonicalTagHtml,
        );

        if (document.includes(this.#jsInjectionPlaceholder)) {
            document = document.replace(this.#jsInjectionPlaceholder, headHtmlContent);
        } else {
            document = document.replace('</head>', headHtmlContent + '</head>');
        }

        request.styleRefs = this.#getRouteStyleRefsToPreload(registryConfig.apps, slots, template.styleRefs);

        if (request.ldeRelated) {
            document = this.#removeProdTags(document);
        }

        return document;
    }

    getAssetsToPreload = async (request) => {
        return {
            scriptRefs: [],
            styleRefs: request.styleRefs,
        };
    };

    #getRouteStyleRefsToPreload = (apps, slots, templateStyleRefs) => {
        const routeStyleRefs = _.reduce(
            slots,
            (styleRefs, slotData) => {
                const appInfo = apps[slotData.appName];

                if (appInfo.cssBundle && !styleRefs.includes(appInfo.cssBundle)) {
                    styleRefs.push(appInfo.cssBundle);
                }

                return styleRefs;
            },
            [],
        );

        const styleRefs = routeStyleRefs.concat(templateStyleRefs);

        return uniqueArray(styleRefs);
    };

    //TODO: add App Wrappers support
    #getRouteAssets = (apps, slots) => {
        const appsDependencies = _.reduce(
            apps,
            (dependencies, appInfo) => _.assign(dependencies, appInfo.dependencies),
            {},
        );

        const routeAssets = _.reduce(
            slots,
            (routeAssets, slotData) => {
                const appInfo = apps[slotData.appName];

                /**
                 * Need to save app's dependencies based on all merged apps dependencies
                 * to avoid duplicate vendors preloads on client side
                 * because apps may have common dependencies but from different sources
                 *
                 * @see {@path ilc/client/initIlcConfig.js}
                 */
                const appDependencies = _.reduce(
                    _.keys(appInfo.dependencies),
                    (appDependencies, dependencyName) => {
                        appDependencies[dependencyName] = appsDependencies[dependencyName];
                        return appDependencies;
                    },
                    {},
                );

                routeAssets.dependencies = _.assign(routeAssets.dependencies, appDependencies);

                if (!_.includes(routeAssets.spaBundles, appInfo.spaBundle)) {
                    routeAssets.spaBundles.push(appInfo.spaBundle);
                }

                if (
                    appInfo.cssBundle &&
                    !_.some(routeAssets.stylesheetLinks, (stylesheetLink) =>
                        _.includes(stylesheetLink, appInfo.cssBundle),
                    )
                ) {
                    const stylesheetLink = this.#wrapWithFragmentStylesheetLink(appInfo.cssBundle, slotData.appName);
                    routeAssets.stylesheetLinks.push(stylesheetLink);
                }

                return routeAssets;
            },
            { spaBundles: [], dependencies: {}, stylesheetLinks: [] },
        );

        const scriptRefs = _.concat(
            [this.#getClientjsUrl()],
            routeAssets.spaBundles,
            _.values(routeAssets.dependencies),
        );
        const withoutDuplicateScriptRefs = uniqueArray(scriptRefs).filter((scriptRef) => !!scriptRef);

        return {
            scriptLinks: _.map(withoutDuplicateScriptRefs, this.#wrapWithLinkToPreloadScript),
            stylesheetLinks: routeAssets.stylesheetLinks,
        };
    };

    #getClientjsUrl = () => (this.#cdnUrl === null ? '/_ilc/client.js' : urljoin(this.#cdnUrl, '/client.js'));

    #getSPAConfig = (registryConfig) => {
        const apps = _.mapValues(registryConfig.apps, (v) =>
            _.pick(v, ['spaBundle', 'cssBundle', 'dependencies', 'props', 'kind', 'wrappedWith', 'l10nManifest']),
        );

        let settings = registryConfig.settings;
        const customHTML = registryConfig.settings?.globalSpinner?.customHTML;

        if (customHTML) {
            settings = {
                ...registryConfig.settings,
                globalSpinner: {
                    ...registryConfig.settings.globalSpinner,
                    customHTML: encodeHtmlEntities(customHTML),
                },
            };
        }

        const routes = registryConfig.routes.map((v) => _.omit(v, ['routeId']));

        let spaConfig = JSON.stringify({
            apps,
            routes,
            specialRoutes: _.mapValues(registryConfig.specialRoutes, (v) => _.omit(v, ['routeId'])),
            settings,
            sharedLibs: registryConfig.sharedLibs,
            dynamicLibs: registryConfig.dynamicLibs,
        });

        return `<script type="text/ilc-config">${spaConfig}</script>`;
    };

    #getIlcState = (request) => {
        const state = request.ilcState || {};
        if (Object.keys(state).length === 0) {
            return '';
        }

        return `<script type="ilc-state">${JSON.stringify(state)}</script>`;
    };

    #wrapWithAsyncScriptTag = (url) => {
        return `<script src="${url}" type="text/javascript" ${this.#getCrossoriginAttribute(url)} async></script>`;
    };

    #wrapWithLinkToPreloadScript = (url) => {
        return `<link rel="preload" href="${url}" as="script" ${this.#getCrossoriginAttribute(url)}>`;
    };

    #wrapWithFragmentStylesheetLink = (url, fragmentId) => {
        return `<link rel="stylesheet" href="${url}" data-fragment-id="${fragmentId}">`;
    };

    #getCrossoriginAttribute = (url) => {
        return (this.#cdnUrl !== null && url.includes(this.#cdnUrl)) || url.includes('://') ? 'crossorigin' : '';
    };

    #wrapWithIgnoreDuringParsing = (...content) =>
        `<!-- TailorX: Ignore during parsing START -->${content.join('')}<!-- TailorX: Ignore during parsing END -->`;

    // TODO(bc): this method should be removed next Major release,
    //  because this code contradicts multiple domains feature, where you usually expects having multiple NR apps on multiple domains
    //  and right now NR script is injected below other scripts, which is not recommended by NR. They recommend to inject as up as possible.
    //  So it is much easier to achieve needed outcome by modifying template.
    // Right now gently backward compatibility is maintained, so everyone who expects NR to be injected in browser will get it.
    #getNewRelicScript = () => {
        if (!this.#nrAutomaticallyInjectClientScript) {
            return '';
        }

        let nrCode = this.#newrelic.getBrowserTimingHeader();
        if (this.#nrCustomClientJsWrapper === null || !nrCode) {
            return nrCode;
        }

        nrCode = nrCode.replace(/<script.*?>(.*)<\/script\s*>/s, '$1');
        return this.#nrCustomClientJsWrapper.replace('%CONTENT%', nrCode);
    };

    #removeProdTags(content) {
        return content.replace(this.#markedProdTags, '');
    }
};
