import crashIlc from './errorHandler/crashIlc';

export class BundleLoader {

    #cache = new WeakMap();
    #registryApps;
    #systemJs;

    constructor(registryConf, systemJs) {
        this.#registryApps = registryConf.apps;
        this.#systemJs = systemJs;
    }

    /**
     * Speculative preload of the JS bundle.
     * We don't care about result as we do it only to heat up browser HTTP cache
     *
     * @param {string} appName
     * @return void
     */
    preloadApp(appName) {
        const app = this.#getApp(appName);

        this.#systemJs.import(app.spaBundle).catch(() => {});

        if (app.wrappedWith) {
            this.preloadApp(app.wrappedWith);
        }
    }

    loadApp(appName) {
        const app = this.#getApp(appName);

        return this.#systemJs.import(appName)
            .then(appBundle => this.#getAppSpaCallbacks(appBundle, app.props))
    }

    loadAppWithCss(appName) {
        const waitTill = [this.loadApp(appName), this.loadCss(appName)];

        return Promise.all(waitTill).then(values => values[0]);
    }

    loadCss(appName) {
        const app = this.#getApp(appName);
        const { cssBundle } = app;

        if (!cssBundle) {
            return Promise.resolve();
        }

        return this.#systemJs.import(cssBundle)
        .then(() => {
            const currentLink = document.querySelector(`link[href="${cssBundle}"]`)
            currentLink.setAttribute('data-fragment-id', appName)
        })
        .catch(err => {
            //TODO: error handling should be improved, need to submit PR with typed errors
            if (typeof err.message !== 'string' || err.message.indexOf('has already been loaded using another way') === -1) {
                throw err;
            }
        });
    }

    unloadCss(appName) {
        const currentLink = document.querySelector(`link[data-fragment-id="${appName}"]`);
        if (!currentLink) {
            // app does not have cssBundle
            return;
        }

        this.#systemJs.delete(currentLink.href);
        currentLink.remove();
    }

    #getApp = (appName) => {
        const app = this.#registryApps[appName];
        if (!app) {
            throw new Error(`Unable to find requested app "${appName}" in Registry`);
        }

        return app;
    }

    #getAppSpaCallbacks = (appBundle, props = {}) => {
        // We do this to make sure that mainSpa function will be called only once
        if (this.#cache.has(appBundle)) {
            return this.#cache.get(appBundle);
        }

        const mainSpa = appBundle.mainSpa || appBundle.default && appBundle.default.mainSpa;

        if (mainSpa !== undefined && typeof mainSpa === 'function') {
            const res = mainSpa(props);
            this.#cache.set(appBundle, res);
            return res;
        } else {
            if (appBundle.default && typeof appBundle.default.mount === 'function') {
                return appBundle.default;
            }

            return appBundle;
        }
    }
}

export default (registryConf) => {
    const System = window.System;
    if (System === undefined) {
        crashIlc();
        throw new Error('ILC: can\'t find SystemJS on a page, crashing everything');
    }

    return new BundleLoader(registryConf, System)
};
