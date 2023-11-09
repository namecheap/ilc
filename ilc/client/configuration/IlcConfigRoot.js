import { decodeHtmlEntities } from '../../common/utils';

export class IlcConfigRoot {
    constructor() {
        const ilcConfigurationNode = document.querySelector('script[type="ilc-config"]');

        if (ilcConfigurationNode === null) {
            throw new Error("Can't find single-spa configuration node. Looks like server side problem occurs.");
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

    /**
     *
     * @param name
     * @description Checks if application is clientless by name. Clientless app is an app w/o clientside bundle. So it renders only on backend side.
     * @returns {boolean}
     */
    isApplicationClientlessByAppName(name) {
        if(!this.registryConfiguration['apps'][name]) {
            throw new Error(`Application with name ${name} is not registered in ILC`);
        }

        return !this.registryConfiguration['apps'][name].spaBundle;
    }

    // @Deprecated. Config for shared lib was designed in non extensible format.
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
        const specialRoute = this.getConfigForSpecialRoutes();
        return specialRoute[key];
    }
}

export const ilcConfigRoot = new IlcConfigRoot();
