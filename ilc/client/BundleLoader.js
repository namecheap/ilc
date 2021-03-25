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
        const app = this.#getApp(appName);
        const waitTill = [this.loadApp(appName)];

        if (app.cssBundle) {
            waitTill.push(this.loadCss(app.cssBundle));
        }

        return Promise.all(waitTill).then(values => values[0]);
    }

    loadCss(url) {
        return this.#systemJs.import(url).catch(err => { //TODO: inserted <link> tags should have "data-fragment-id" attr. Same as Tailor now does
            //TODO: error handling should be improved, need to submit PR with typed errors
            if (typeof err.message !== 'string' || err.message.indexOf('has already been loaded using another way') === -1) {
                throw err;
            }
        });
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

        if (mainSpa !== undefined) {
            const res = mainSpa(props);
            this.#cache.set(appBundle, res);
            return res;
        } else {
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
