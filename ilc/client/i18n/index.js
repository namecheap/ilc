import IlcAppSdk from 'ilc-server-sdk/dist/client';

export default class I18n {
    #prevUrl = null;
    #systemSdk = null;
    #singleSpa;
    #intlAdapterSystem;

    constructor(registrySettings, singleSpa) {
        this.#prevUrl = window.location.href;
        this.#singleSpa = singleSpa;
        this.#intlAdapterSystem = {
            get: () => ({locale: document.documentElement.lang, currency: 'USD'}),
            getDefault: () => registrySettings.default,
            getSupported: () => registrySettings.supported,
        };

        this.#systemSdk = new IlcAppSdk({appId: 'ILC:System', intl: this.#intlAdapterSystem});

        this.#initPatchedWindow(this.#systemSdk);
        window.addEventListener('single-spa:before-mount-routing-event', this.#onBeforeAppsMount);
    }

    getAdapter() {
        return Object.assign({set: this.#setIntlSettings}, this.#intlAdapterSystem);
    }

    #initPatchedWindow = (systemSdk) => {
        const patchedLocation = new Proxy(window.location, { //TODO: fix issue with IE11, proxies are not supported there
            get(target, name) {
                if (typeof target[name] === 'function') {
                    return target[name];
                }

                return systemSdk.intl.parseUrl(target).cleanUrl[name];
            },
        });

        window.ILC.window = new Proxy(window, { //TODO: fix issue with IE11, proxies are not supported there
            get(target, name) {
                return name === 'location' ? patchedLocation : target[name];
            },
        });
    };

    #setIntlSettings = async (conf) => {
        if (!conf.locale) {
            return;
        }

        if (!this.#systemSdk.intl.getSupported().locale.includes(conf.locale)) {
            throw new Error('Invalid locale passed');
        }
        const newLocaleUrl = this.#systemSdk.intl.localizeUrl(window.location.href, conf.locale).toString();
        this.#singleSpa.navigateToUrl(newLocaleUrl);
    };

    #onBeforeAppsMount = () => {
        const prevLocale = this.#systemSdk.intl.parseUrl(this.#prevUrl).locale;
        const currLocale = this.#systemSdk.intl.parseUrl(window.location.href).locale;
        if (this.#prevUrl !== window.location.href) {
            this.#prevUrl = window.location.href;
        }
        if (prevLocale === currLocale) {
            return;
        }

        document.documentElement.lang = currLocale;

        let loader = null;
        const promises = [];

        const onAllResourcesReady = () => this.#iterablePromise(promises).then(() => {
            if (loader) {
                loader.close();
                window.document.body.removeChild(loader);
                loader = null;
            }
        });
        const detail = Object.assign(this.#systemSdk.intl.get(), {
            addPendingResources: (promise) => {
                if (!loader) {
                    loader = document.createElement('dialog');
                    loader.innerHTML = 'loading....';
                    window.document.body.append(loader);
                    loader.showModal();
                }
                promises.push(promise);
            },
            onAllResourcesReady: onAllResourcesReady,
        });

        window.dispatchEvent(new CustomEvent('ilc:intl-update', {detail}));
        return onAllResourcesReady();
    };

    #iterablePromise = (iterable) => {
        return Promise.all(iterable).then((resolvedIterable) => {
            if (iterable.length !== resolvedIterable.length) {
                // The list of promises or values changed. Return a new Promise.
                // The original promise won't resolve until the new one does.
                return this.#iterablePromise(iterable);
            }
            // The list of promises or values stayed the same.
            // Return results immediately.
            return resolvedIterable;
        });
    };
}
