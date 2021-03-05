const System = window.System;

export default class BundleLoader {

    #cache = new WeakMap();
    #registry;

    constructor(registryConf) {
        this.#registry = registryConf;
    }

    loadApp(appName) {
        const app = this.#registry.apps[appName];
        if (!app) {
            throw new Error(`Unable to find requested app "${appName}" in Registry`);
        }

        return System.import(appName)
            .then(appBundle => this.#getAppSpaCallbacks(appBundle, app.props))
    }

    #getAppSpaCallbacks = (appBundle, props = {}) => {
        // We do this to make sure that mainSpa function will be called only once
        if (this.#cache.has(appBundle)) {
            return this.#cache.get(appBundle);
        }

        const mainSpa = appBundle.mainSpa || appBundle.default && appBundle.default.mainSpa;

        if (mainSpa !== undefined) {
            const res = mainSpa(props);
            this.#cache.set(appBundle, res);
            return res;
        } else {
            return appBundle;
        }
    }
}
