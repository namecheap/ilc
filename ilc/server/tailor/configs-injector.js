const _ = require('lodash');
const urljoin = require('url-join');
const newrelic = require('newrelic');

module.exports = class ConfigsInjector {
    #registry;
    #router;
    #cdnUrl;

    constructor(registry, router, cdnUrl = null) {
        this.#registry = registry;
        this.#router = router;
        this.#cdnUrl = cdnUrl;
    }


    async inject(document, reqUrl) {
        if (typeof document !== 'string' || document.indexOf('<head>') === -1 || document.indexOf('</body>') === -1) {
            throw new Error(`Can't inject ILC configs into invalid document.`);
        }

        const registryConf = await this.#registry.getConfig();

        const regConf = registryConf.data;

        document = document.replace('</body>', this.#wrapWithIgnoreDuringParsing(
            this.#hideHTMLtoAvoidFOUC(false),
            this.#getSPAConfig(regConf),
            this.#getPolyfill(),
            this.#wrapWithAsyncScriptTag(this.#getClientjsUrl()),
        ) + '</body>');

        document = document.replace('</head>', this.#wrapWithIgnoreDuringParsing(
            newrelic.getBrowserTimingHeader(),
            this.#hideHTMLtoAvoidFOUC(),
        ) + '</head>');

        const scriptRefs = await this.#getRouteScriptRefs(reqUrl);

        document = document.replace('<head>', '<head>' + this.#wrapWithIgnoreDuringParsing(
            ...scriptRefs.map(this.#wrapWithLinkToPreloadScript),
        ));

        return document;
    }

    getAssetsToPreload = async (request) => {
        const styleRefs = await this.#getRouteCssBundles(request.url);

        return {
            scriptRefs: [this.#getClientjsUrl()],
            styleRefs,
        };
    };

    #getRouteCssBundles = async (reqUrl) => {
        const registryConf = await this.#registry.getConfig();
        const route = await this.#router.getRouteInfo(reqUrl);

        const apps = registryConf.data.apps;

        return _.reduce(route.slots, (cssBundles, slotData) => {
            const appInfo = apps[slotData.appName];

            if (!_.includes(cssBundles, appInfo.cssBundle)) {
                cssBundles.push(appInfo.cssBundle);
            }

            return cssBundles;
        }, []);
    };

    #getRouteScriptRefs = async (reqUrl) => {
        const registryConf = await this.#registry.getConfig();
        const route = await this.#router.getRouteInfo(reqUrl);

        const apps = registryConf.data.apps;
        const appsDependencies = _.reduce(apps, (dependencies, appInfo) => _.assign(dependencies, appInfo.dependencies), {});

        const routeAssets = _.reduce(route.slots, (routeAssets, slotData) => {
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

            return routeAssets;
        }, {spaBundles: [], dependencies: {}});

        return _.concat(routeAssets.spaBundles, _.values(routeAssets.dependencies));
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

    #getSPAConfig = (registryConf) => {
        registryConf.apps = _.mapValues(registryConf.apps, v => _.pick(v, ['spaBundle', 'cssBundle', 'dependencies', 'props', 'initProps', 'kind']));

        return `<script type="spa-config">${JSON.stringify(_.omit(registryConf, ['templates']))}</script>`;
    };

    /**
     * This style is needed to avoid a flash of unstyled content (FOUC) on Firefox
     * 
     * @see {@link https://bugzilla.mozilla.org/show_bug.cgi?id=1404468}
     * @see {@link https://petrey.co/2017/05/the-most-effective-way-to-avoid-the-fouc/}
     * @see {@link https://gist.github.com/electrotype/7960ddcc44bc4aea07a35603d1c41cb0#file-fouc-fix-md}
     * @see {@link https://stackoverflow.com/questions/952861/targeting-only-firefox-with-css}
     */
    #hideHTMLtoAvoidFOUC = (hideHTML = true) => {
        const visibility = hideHTML ? 'hidden' : 'visible';
        const opacity = hideHTML ? 0 : 1;

        return `<style>@supports (-moz-appearance:none) { html { visibility: ${visibility}; opacity: ${opacity}; }}</style>`;
    }

    #wrapWithAsyncScriptTag = (url) => {
        return `<script src="${url}" type="text/javascript" ${this.#getCrossoriginAttribute(url)} async></script>`;
    };

    #wrapWithLinkToPreloadScript = (url) => {
        return `<link rel="preload" href="${url}" as="script" ${this.#getCrossoriginAttribute(url)}>`;
    };

    #getCrossoriginAttribute = (url) => {
        return (this.#cdnUrl !== null && url.includes(this.#cdnUrl)) || url.includes('://') ? 'crossorigin' : '';
    };

    #wrapWithIgnoreDuringParsing = (...content) => `<!-- TailorX: Ignore during parsing START -->${content.join('')}<!-- TailorX: Ignore during parsing END -->`;
};
