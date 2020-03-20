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


    async inject(document) {
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

        return document;
    }

    getAssetsToPreload = async (request) => {
        const routeAssets = await this.#getRouteAssets(request.url);
        
        return {
            scriptRefs: _.concat([this.#getClientjsUrl()], routeAssets),
        };
    };
    
    #getRouteAssets = async (reqUrl) => {
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

    #getPolyfill = () =>
        `<script type="text/javascript">
            if (!(
                typeof window.URL === 'function' &&
                Object.entries &&
                Object.assign &&
                DocumentFragment.prototype.append &&
                Element.prototype.append &&
                Element.prototype.remove
            )) {
                document.write('<script src="${this.#getPolyfillUrl()}" type="text/javascript" ${this.#cdnUrl !== null ? 'crossorigin' : ''}></scr' + 'ipt>');
            }
        </script>`;

    #getClientjsUrl = () => this.#cdnUrl === null ? '/_ilc/client.js.gz' : urljoin(this.#cdnUrl, '/client.js.gz');
    #getPolyfillUrl = () => this.#cdnUrl === null ? '/_ilc/polyfill.min.js.gz' : urljoin(this.#cdnUrl, '/polyfill.min.js.gz');

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
        const crossorigin = this.#cdnUrl !== null ? 'crossorigin' : '';

        return `<script src="${url}" type="text/javascript" ${crossorigin} async></script>`;
    };

    #wrapWithIgnoreDuringParsing = (...content) => `<!-- TailorX: Ignore during parsing START -->${content.join('')}<!-- TailorX: Ignore during parsing END -->`;
};
