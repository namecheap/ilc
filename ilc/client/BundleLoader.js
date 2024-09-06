import { CssTrackedApp } from './CssTrackedApp';
import { SdkOptions } from '../common/SdkOptions';

export const emptyClientApplication = Object.freeze({
    mount: () => Promise.resolve(),
    unmount: () => Promise.resolve(),
    bootstrap: () => Promise.resolve(),
});

export class BundleLoader {
    #cache = new WeakMap();
    #registryApps;
    #moduleLoader;
    #delayCssRemoval;
    #configRoot;
    #sdkFactoryBuilder;

    constructor(configRoot, moduleLoader, sdkFactoryBuilder) {
        this.#registryApps = configRoot.getConfigForApps();
        this.#delayCssRemoval = configRoot.isGlobalSpinnerEnabled();
        this.#moduleLoader = moduleLoader;
        this.#configRoot = configRoot;
        this.#sdkFactoryBuilder = sdkFactoryBuilder;
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

        if (!app.spaBundle) {
            return;
        }

        this.#moduleLoader.import(app.spaBundle).catch(() => {});

        if (app.wrappedWith) {
            this.preloadApp(app.wrappedWith);
        }
    }

    /**
     *
     * @param {string} appName
     * @param {boolean} options.injectGlobalCss to css with <link> element in <head>
     * @returns Promise<object> application
     */
    loadApp(appName, { injectGlobalCss = true } = {}) {
        const applicationConfig = this.#getApp(appName);
        if (!applicationConfig.spaBundle) {
            // it is SSR only app
            return Promise.resolve(emptyClientApplication);
        }

        return this.#moduleLoader.import(appName).then((appBundle) => {
            const sdkInstanceFactory = this.#sdkFactoryBuilder.getSdkFactoryByApplicationName(appName);
            const rawCallbacks = this.#getAppSpaCallbacks(appBundle, applicationConfig.props, {
                sdkFactory: sdkInstanceFactory,
            });
            const application =
                typeof applicationConfig.cssBundle === 'string' && injectGlobalCss !== false
                    ? new CssTrackedApp(
                          rawCallbacks,
                          applicationConfig.cssBundle,
                          this.#delayCssRemoval,
                      ).getDecoratedApp()
                    : rawCallbacks;
            return application;
        });
    }

    loadAppWithCss(appName) {
        const app = this.#getApp(appName);
        const waitTill = [this.loadApp(appName)];

        if (app.cssBundle) {
            waitTill.push(this.loadCss(app.cssBundle));
        }

        return Promise.all(waitTill).then((values) => values[0]);
    }

    loadCss(url) {
        return this.#moduleLoader.import(url).catch((err) => {
            //TODO: inserted <link> tags should have "data-fragment-id" attr. Same as Tailor now does
            //TODO: error handling should be improved, need to submit PR with typed errors
            if (
                typeof err.message !== 'string' ||
                err.message.indexOf('has already been loaded using another way') === -1
            ) {
                throw err;
            }
        });
    }

    #getApp = (appName) => {
        const app = this.#configRoot.getConfigForAppByName(appName);
        if (!app) {
            throw new Error(`Unable to find requested app "${appName}" in Registry`);
        }

        return app;
    };

    #getAppSpaCallbacks = (appBundle, props = {}, { sdkFactory, cacheEnabled }) => {
        // We do this to make sure that mainSpa function will be called only once
        if (this.#cache.has(appBundle)) {
            return this.#cache.get(appBundle);
        }

        const mainSpa = appBundle.mainSpa || (appBundle.default && appBundle.default.mainSpa);

        if (mainSpa !== undefined && typeof mainSpa === 'function') {
            const res = mainSpa(props, { sdkFactory });
            this.#cache.set(appBundle, res);
            return res;
        } else {
            if (appBundle.default && typeof appBundle.default.mount === 'function') {
                return appBundle.default;
            }

            return appBundle;
        }
    };

    /**
     *
     * @param {String} appName application name
     */
    unloadApp(appName) {
        const moduleId = this.#moduleLoader.resolve(appName);
        const appBundle = this.#moduleLoader.get(moduleId);
        this.#cache.delete(appBundle);
        this.#moduleLoader.delete(moduleId);
    }
}
