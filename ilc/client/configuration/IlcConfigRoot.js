import {decodeHtmlEntities} from '../../common/utils';

class IlcConfigRoot {
    constructor() {
        const ilcConfigurationNode = document.querySelector('script[type="ilc-config"]');

        if (ilcConfigurationNode === null) {
            throw new Error('Can\'t find single-spa configuration node. Looks like server side problem occurs.');
        }

        let registryConfiguration;

        try {
            registryConfiguration = JSON.parse(ilcConfigurationNode.innerHTML);
        } catch(e) {
            throw new Error(`Parse: ${ilcConfigurationNode.innerHTML}`);
        }



        const customHTML = registryConfiguration.settings?.globalSpinner?.customHTML;
        if (customHTML) {
            registryConfiguration.settings.globalSpinner.customHTML = decodeHtmlEntities(customHTML);
        }

        this.registryConfiguration = registryConfiguration;
    }

    getConfig() {
        return this.registryConfiguration;
    }

    getConfigForApps() {
        return this.registryConfiguration['apps'];
    }

    getConfigForAppByName(name) {
        return this.registryConfiguration['apps'][name];
    }

    getConfigForSharedLibs() {
        return this.registryConfiguration['sharedLibs'];
    }

    getSettings() {
        return this.registryConfiguration['settings'];
    }
}

export const ilcConfigRoot = new IlcConfigRoot();

