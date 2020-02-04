const _ = require('lodash');
const urljoin = require('url-join');

const helpers = require('../../helpers');

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

        const systemjsUrl = this.#cdnUrl === null ? '/_ilc/system.js' : urljoin(this.#cdnUrl, '/system.js');
        const clientjsUrl = this.#cdnUrl === null ? '/_ilc/client.js' : urljoin(this.#cdnUrl, '/client.js');

        const tpl =
            helpers.getSystemjsImportmap(regConf.apps) +
            helpers.getSPAConfig(regConf) +
            `<script src="${clientjsUrl}" type="text/javascript"></script>`;

        document = document.replace('</body>', tpl + '</body>');

        document = document.replace('<head>', `<head><script src="${systemjsUrl}" type="text/javascript"></script>`);

        return document;
    }
};
