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

    // @Deprecated. Config for shared lib was desinged in non extensible format.
    // Next Major release it will require breaking change to return configuration object
    getConfigForSharedLibs() {
        return this.registryConfiguration['sharedLibs'];
    }

    getConfigForSharedLibsByName(name) {
        return this.registryConfiguration['dynamicLibs'][name];
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

    getConfigForRoutes() {
        return this.registryConfiguration['routes'];
    }

    getConfigForSpecialRoutes() {
        return this.registryConfiguration['specialRoutes'] || {};
    }

    /**
     *
     * @param {string} key
     * @return {object}
     */
    getConfigForSpecialRoutesByKey(key) {
        const specialRouteByKey = this.getConfigForSpecialRoutes()[key];
        if(!specialRouteByKey){
            throw new Error(`IlcConfigRoot config error. ${key} is not exists in specialRoute`);
        }

        return specialRouteByKey;
    }
}

export const ilcConfigRoot = new IlcConfigRoot();

