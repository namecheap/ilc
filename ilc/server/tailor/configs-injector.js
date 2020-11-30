const _ = require('lodash');
const urljoin = require('url-join');

module.exports = class ConfigsInjector {
    #newrelic;
    #nrCustomClientJsWrapper;
    #cdnUrl;
    #jsInjectionPlaceholder = '<!-- ILC_JS -->';
    #cssInjectionPlaceholder = '<!-- ILC_CSS -->';

    constructor(newrelic, cdnUrl = null, nrCustomClientJsWrapper = null) {
        this.#newrelic = newrelic;
        this.#cdnUrl = cdnUrl;
        this.#nrCustomClientJsWrapper = nrCustomClientJsWrapper;
    }

    inject(request, registryConfig, template, slots) {
        let document = template.content;

        if (
            typeof document !== 'string' || !document.includes('<html') ||
            !document.includes('</head>') || !document.includes('<head>') ||
            !document.includes('</body>') || !document.includes('<body>')
        ) {
            throw new Error(`Can't inject ILC configs into invalid document.`);
        }

        if (request.ilcState && request.ilcState.locale) {
            document = document.replace('<html', `<html lang="${request.ilcState.locale}"`);
            delete request.ilcState.locale; // We don't need it at client side
        }

        const routeAssets = this.#getRouteAssets(registryConfig.apps, slots);
        const ilcCss = this.#wrapWithIgnoreDuringParsing(
            ...routeAssets.stylesheetLinks,
        );

        if (document.includes(this.#cssInjectionPlaceholder)) {
            document = document.replace(this.#cssInjectionPlaceholder, ilcCss);
        } else {
            document = document.replace('</head>', ilcCss + '</head>');
        }

        const ilcJsScripts = this.#wrapWithIgnoreDuringParsing(
            //...routeAssets.scriptLinks,
            this.#getIlcState(request),
            this.#getSPAConfig(registryConfig),
            `<script>window.ilcApps = [];</script>`,
            this.#getPolyfill(),
            this.#wrapWithAsyncScriptTag(this.#getClientjsUrl()),
            this.#getNewRelicScript(),
        );

        if (document.includes(this.#jsInjectionPlaceholder)) {
            document = document.replace(this.#jsInjectionPlaceholder, ilcJsScripts);
        } else {
            document = document.replace('</head>', ilcJsScripts + '</head>');
        }

        request.styleRefs = this.#getRouteStyleRefsToPreload(registryConfig.apps, slots, template.styleRefs);

        return document;
    }

    getAssetsToPreload = async (request) => {
        return {
            scriptRefs: [],
            styleRefs: request.styleRefs,
        };
    };

    #getRouteStyleRefsToPreload = (apps, slots, templateStyleRefs) => {
        const routeStyleRefs = _.reduce(slots, (styleRefs, slotData) => {
            const appInfo = apps[slotData.appName];

            if (appInfo.cssBundle && !_.includes(styleRefs, appInfo.cssBundle)) {
                styleRefs.push(appInfo.cssBundle);
            }

            return styleRefs;
        }, []);

        const styleRefs = _.concat(routeStyleRefs, templateStyleRefs);

        return _.filter(styleRefs, (styleRef, index, styleRefs) => styleRefs.indexOf(styleRef) === index);
    };

    #getRouteAssets = (apps, slots) => {
        const appsDependencies = _.reduce(apps, (dependencies, appInfo) => _.assign(dependencies, appInfo.dependencies), {});

        const routeAssets = _.reduce(slots, (routeAssets, slotData) => {
            const appInfo = apps[slotData.appName];

            /**
             * Need to save app's dependencies based on all merged apps dependencies
             * to avoid duplicate vendors preloads on client side
             * because apps may have common dependencies but from different sources
             *
             * @see {@path ilc/client/initIlcConfig.js}
             */
            const appDependencies = _.reduce(_.keys(appInfo.dependencies), (appDependencies, dependencyName) => {
                appDependencies[dependencyName] = appsDependencies[dependencyName];
                return appDependencies;
            }, {});

            routeAssets.dependencies = _.assign(routeAssets.dependencies, appDependencies);

            if (!_.includes(routeAssets.spaBundles, appInfo.spaBundle)) {
                routeAssets.spaBundles.push(appInfo.spaBundle);
            }

            if (
                appInfo.cssBundle &&
                !_.some(routeAssets.stylesheetLinks, (stylesheetLink) => _.includes(stylesheetLink, appInfo.cssBundle))
            ) {
                const stylesheetLink = this.#wrapWithFragmentStylesheetLink(appInfo.cssBundle, slotData.appName);
                routeAssets.stylesheetLinks.push(stylesheetLink);
            }

            return routeAssets;
        }, {spaBundles: [], dependencies: {}, stylesheetLinks: []});

        const scriptRefs = _.concat([this.#getClientjsUrl()], routeAssets.spaBundles, _.values(routeAssets.dependencies));
        const withoutDuplicateScriptRefs = _.filter(scriptRefs, (scriptRef, index, scriptRefs) => scriptRefs.indexOf(scriptRef) === index);

        return {
            scriptLinks: _.map(withoutDuplicateScriptRefs, this.#wrapWithLinkToPreloadScript),
            stylesheetLinks: routeAssets.stylesheetLinks,
        };
    };

    #getPolyfill = () => {
        const url = this.#getPolyfillUrl();

        return (
            `<script type="text/javascript">` +
                `if (!(` +
                    `typeof window.URL === 'function' && ` +
                    `Object.entries && ` +
                    `Object.assign && ` +
                    `DocumentFragment.prototype.append && ` +
                    `Element.prototype.append && ` +
                    `Element.prototype.remove` +
                `)) {` +
                    `document.write('<script src="${url}" type="text/javascript" ${this.#getCrossoriginAttribute(url)}></scr' + 'ipt>');` +
                `}` +
            `</script>`
        );
    };

    #getClientjsUrl = () => this.#cdnUrl === null ? '/_ilc/client.js' : urljoin(this.#cdnUrl, '/client.js');
    #getPolyfillUrl = () => this.#cdnUrl === null ? '/_ilc/polyfill.min.js' : urljoin(this.#cdnUrl, '/polyfill.min.js');

    #getSPAConfig = (registryConfig) => {
        const apps = _.mapValues(registryConfig.apps, v => _.pick(v, ['spaBundle', 'cssBundle', 'dependencies', 'props', 'kind']));
        const spaConfig = JSON.stringify(_.omit({...registryConfig, apps}, ['templates']));

        return `<script type="ilc-config">${spaConfig}</script>`;
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

    #wrapWithIgnoreDuringParsing = (...content) => `<!-- TailorX: Ignore during parsing START -->${content.join('')}<!-- TailorX: Ignore during parsing END -->`;

    #getNewRelicScript = () => {
        let nrCode = this.#newrelic.getBrowserTimingHeader();

        if (this.#nrCustomClientJsWrapper === null || !nrCode) {
            return nrCode;
        }

        nrCode = nrCode.replace(/<script.*?>(.*)<\/script\s*>/s, '$1');

        return this.#nrCustomClientJsWrapper.replace('%CONTENT%', nrCode);
    }
};
