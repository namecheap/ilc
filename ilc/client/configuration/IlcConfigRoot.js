import {decodeHtmlEntities} from '../../common/utils';

export class IlcConfigRoot {
    constructor() {
        const ilcConfigurationNode = document.querySelector('script[type="ilc-config"]');

        if (ilcConfigurationNode === null) {
            throw new Error('Can\'t find single-spa configuration node. Looks like server side problem occurs.');
        }

        const registryConfiguration = JSON.parse(ilcConfigurationNode.innerHTML);

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

    getSettingsByKey(key) {
        return this.registryConfiguration['settings'][key];
    }

    isGlobalSpinnerEnabled() {
        const globalSpinnerConfig = this.getSettingsByKey('globalSpinner');
        const isEnabled = globalSpinnerConfig && globalSpinnerConfig.enabled;
        return !!isEnabled;
    }
}

export const ilcConfigRoot = new IlcConfigRoot();

