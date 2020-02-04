const _ = require('lodash');
const urljoin = require('url-join');

module.exports = class ConfigsInjector {
    #registry;
    #cdnUrl;

    constructor(registry, cdnUrl = null) {
        this.#registry = registry;
        this.#cdnUrl = cdnUrl;
    }


    async inject(document) {
        if (typeof document !== 'string' || document.indexOf('<head>') === -1 || document.indexOf('</body>') === -1) {
            throw new Error(`Can't inject ILC configs into invalid document.`);
        }

        const registryConf = await this.#registry.getConfig();

        const regConf = registryConf.data;

        const tpl =
            this.#getSPAConfig(regConf) +
            `<script src="${this.#getClientjsUrl()}" type="text/javascript"></script>`;

        document = document.replace('</body>', tpl + '</body>');

        document = document.replace('<head>', `<head><script src="${this.#getSystemjsUrl()}" type="text/javascript"></script>`);

        return document;
    }

    getAssetsToPreload = () => {
        return {
            scriptRefs: [this.#getSystemjsUrl(), this.#getClientjsUrl()]
        };
    };

    #getSystemjsUrl = () => this.#cdnUrl === null ? '/_ilc/system.js' : urljoin(this.#cdnUrl, '/system.js');
    #getClientjsUrl = () => this.#cdnUrl === null ? '/_ilc/client.js' : urljoin(this.#cdnUrl, '/client.js');

    #getSPAConfig = (registryConf) => {
        registryConf.apps = _.mapValues(registryConf.apps, v => _.pick(v, ['spaBundle', 'cssBundle', 'dependencies', 'props', 'initProps', 'kind']));

        return `<script type="spa-config">${JSON.stringify(_.omit(registryConf, ['templates']))}</script>`;
    }
};
