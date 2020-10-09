import IlcAppSdk from 'ilc-server-sdk/dist/client';
import {handleAsyncAction} from '../handlePageTransaction';

export default class I18n {
    #prevUrl = null;
    /** @type {IlcAppSdk} */
    #systemSdk;
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

        window.addEventListener('single-spa:before-mount-routing-event', this.#onBeforeAppsMount);
    }

    unlocalizeUrl = v => this.#systemSdk.intl.parseUrl(v).cleanUrl;

    getAdapter() {
        return Object.assign({set: this.#setIntl}, this.#intlAdapterSystem);
    }

    /**
     *
     * @param {object} conf
     * @param {string} [conf.locale]
     * @param {string} [conf.currency]
     * @return void
     */
    #setIntl = (conf) => {
        if (!conf.locale) {
            return;
        }

        if (!this.#systemSdk.intl.getSupported().locale.includes(conf.locale)) {
            throw new Error('Invalid locale passed');
        }
        const newLocaleUrl = this.#systemSdk.intl.localizeUrl(window.location.pathname, conf.locale).toString();
        this.#singleSpa.navigateToUrl(newLocaleUrl);
    };

    #onBeforeAppsMount = () => {
        const prevLocale = this.#systemSdk.intl.parseUrl(this.#prevUrl).locale;
        const currLocale = this.#systemSdk.intl.parseUrl(window.location.pathname).locale;
        if (this.#prevUrl !== window.location.pathname) {
            this.#prevUrl = window.location.pathname;
        }
        if (prevLocale === currLocale) {
            return;
        }

        document.documentElement.lang = currLocale;

        const promises = [];
        const onAllResourcesReady = () => this.#iterablePromise(promises);
        const detail = Object.assign(this.#systemSdk.intl.get(), {
            addPendingResources: promise => promises.push(promise),
            onAllResourcesReady: onAllResourcesReady,
        });

        window.dispatchEvent(new CustomEvent('ilc:intl-update', {detail}));

        const afterAllResReady = onAllResourcesReady().catch(err => {
            console.warn(`ILC: error happened during change of the i18n configuration. See error details below. Rolling back...`);
            console.error(err);
            this.#setIntl({locale: prevLocale});
        });
        handleAsyncAction(afterAllResReady);

        return afterAllResReady;
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
