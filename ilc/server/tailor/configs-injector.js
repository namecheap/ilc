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
            this.#getSPAConfig(regConf),
            this.#getPolyfill(),
            this.#wrapWithAsyncScriptTag(this.#getClientjsUrl()),
        ) + '</body>');

        document = document.replace('<head>', '<head>' + this.#wrapWithIgnoreDuringParsing(
            newrelic.getBrowserTimingHeader(),
        ));

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

        const routeAssets = _.reduce(route.slots, (routeAssets, slotData) => {
            const appInfo = registryConf.data.apps[slotData.appName];

            if (!_.includes(routeAssets.spaBundles, appInfo.spaBundle)) {
                routeAssets.spaBundles.push(appInfo.spaBundle);
            }

            routeAssets.dependencies = _.assign(routeAssets.dependencies, appInfo.dependencies);

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

    #getClientjsUrl = () => this.#cdnUrl === null ? '/_ilc/client.js' : urljoin(this.#cdnUrl, '/client.js');
    #getPolyfillUrl = () => this.#cdnUrl === null ? '/_ilc/polyfill.min.js' : urljoin(this.#cdnUrl, '/polyfill.min.js');

    #getSPAConfig = (registryConf) => {
        registryConf.apps = _.mapValues(registryConf.apps, v => _.pick(v, ['spaBundle', 'cssBundle', 'dependencies', 'props', 'initProps', 'kind']));

        return `<script type="spa-config">${JSON.stringify(_.omit(registryConf, ['templates']))}</script>`;
    };

    #wrapWithAsyncScriptTag = (url) => {
        const crossorigin = this.#cdnUrl !== null ? 'crossorigin' : '';

        return `<script src="${url}" type="text/javascript" ${crossorigin} async></script>`;
    };

    #wrapWithIgnoreDuringParsing = (...content) => `<!-- TailorX: Ignore during parsing START -->${content.join('')}<!-- TailorX: Ignore during parsing END -->`;
};
