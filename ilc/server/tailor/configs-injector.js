const _ = require('lodash');
const urljoin = require('url-join');
const newrelic = require('newrelic');

module.exports = class ConfigsInjector {
    #cdnUrl;
    #jsInjectionPlaceholder = '<!-- ILC_JS -->';

    constructor(cdnUrl = null) {
        this.#cdnUrl = cdnUrl;
    }

    inject(request, registryConfig, template, slots) {
        let document = template.content;

        if (typeof document !== 'string' || document.indexOf('<head>') === -1 || document.indexOf('</body>') === -1) {
            throw new Error(`Can't inject ILC configs into invalid document.`);
        }
        
        const routeAssets = this.#getRouteAssets(registryConfig.apps, slots);

        const ilcJsScripts = this.#wrapWithIgnoreDuringParsing(
            //...routeAssets.scriptLinks,
            this.#getSPAConfig(registryConfig),
            `<script>window.ilcApps = [];</script>`,
            this.#getPolyfill(),
            this.#wrapWithAsyncScriptTag(this.#getClientjsUrl()),
            newrelic.getBrowserTimingHeader(),
        );

        if (document.includes(this.#jsInjectionPlaceholder)) {
            document = document.replace(this.#jsInjectionPlaceholder, ilcJsScripts);
        } else {
            document = document.replace('</head>', ilcJsScripts + '</head>');
        }

        document = document.replace('<head>', '<head>' + this.#wrapWithIgnoreDuringParsing(
            ...routeAssets.stylesheetLinks,
        ));

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
             * @see {@path ilc/client/initSpaConfig.js}
             */
            const appDependencies = _.reduce(_.keys(appInfo.dependencies), (appDependencies, dependencyName) => {
                appDependencies[dependencyName] = appsDependencies[dependencyName];
                return appDependencies;
            }, {});

            routeAssets.dependencies = _.assign(routeAssets.dependencies, appDependencies);

            if (!_.includes(routeAssets.spaBundles, appInfo.spaBundle)) {
                routeAssets.spaBundles.push(appInfo.spaBundle);
            }

            if (appInfo.cssBundle) {
                const stylesheetLink = this.#wrapWithFragmentStylesheetLink(appInfo.cssBundle, slotData.appName);

                if (!_.includes(routeAssets.stylesheetLinks, stylesheetLink)) {
                    routeAssets.stylesheetLinks.push(stylesheetLink);
                }
            }

            return routeAssets;
        }, { spaBundles: [], dependencies: {}, stylesheetLinks: [] });

        const scriptRefs = _.concat([this.#getClientjsUrl()], routeAssets.spaBundles, _.values(routeAssets.dependencies));

        return {
            scriptLinks: _.map(scriptRefs, this.#wrapWithLinkToPreloadScript),
            stylesheetLinks: routeAssets.stylesheetLinks,
        };
    };

    #getPolyfill = () => {
        const url = this.#getPolyfillUrl();

        return (
            `<script type="text/javascript">
                if (!(
                    typeof window.URL === 'function' &&
                    Object.entries &&
                    Object.assign &&
                    DocumentFragment.prototype.append &&
                    Element.prototype.append &&
                    Element.prototype.remove
                )) {
                    document.write('<script src="${url}" type="text/javascript" ${this.#getCrossoriginAttribute(url)}></scr' + 'ipt>');
                }
            </script>`
        );
    };

    #getClientjsUrl = () => this.#cdnUrl === null ? '/_ilc/client.js' : urljoin(this.#cdnUrl, '/client.js');
    #getPolyfillUrl = () => this.#cdnUrl === null ? '/_ilc/polyfill.min.js' : urljoin(this.#cdnUrl, '/polyfill.min.js');

    #getSPAConfig = (registryConfig) => {
        const apps = _.mapValues(registryConfig.apps, v => _.pick(v, ['spaBundle', 'cssBundle', 'dependencies', 'props', 'initProps', 'kind']));
        const spaConfig = JSON.stringify(_.omit({...registryConfig, apps}, ['templates']));

        return `<script type="spa-config">${spaConfig}</script>`;
    };

    #wrapWithAsyncScriptTag = (url) => {
        return `<script src="${url}" type="text/javascript" ${this.#getCrossoriginAttribute(url)} async></script>`;
    };

    #wrapWithLinkToPreloadScript = (url) => {
        return `<link rel="preload" href="${url}" as="script" ${this.#getCrossoriginAttribute(url)}>`;
    };

    #wrapWithFragmentStylesheetLink = (url, fragmentId) => {
        return `<link rel="stylesheet" href="${url}" data-fragment-id="${fragmentId}">`;
    }

    #getCrossoriginAttribute = (url) => {
        return (this.#cdnUrl !== null && url.includes(this.#cdnUrl)) || url.includes('://') ? 'crossorigin' : '';
    };

    #wrapWithIgnoreDuringParsing = (...content) => `<!-- TailorX: Ignore during parsing START -->${content.join('')}<!-- TailorX: Ignore during parsing END -->`;
};
