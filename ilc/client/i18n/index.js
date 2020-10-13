import IlcAppSdk from 'ilc-server-sdk/dist/client';
import {handleAsyncAction} from '../handlePageTransaction';
import {triggerAppChange} from '../navigationEvents';

export default class I18n {
    #prevConfig;
    /** @type {IlcAppSdk} */
    #systemSdk;
    #singleSpa;
    #intlAdapterSystem;
    #rollbackInProgress = false;
    #triggerAppChange;
    #currentCurrency = 'USD'; //TODO: to be changes in future

    constructor(registrySettings, singleSpa, triggerAppsChange = triggerAppChange) {
        this.#triggerAppChange = triggerAppsChange;
        this.#singleSpa = singleSpa;
        this.#intlAdapterSystem = {
            get: () => ({locale: document.documentElement.lang, currency: this.#currentCurrency}),
            getDefault: () => registrySettings.default,
            getSupported: () => registrySettings.supported,
        };
        this.#prevConfig = this.#intlAdapterSystem.get();

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
        if (conf.locale && !this.getAdapter().getSupported().locale.includes(conf.locale)) {
            throw new Error('Invalid locale passed');
        }
        if (conf.currency && !this.getAdapter().getSupported().currency.includes(conf.currency)) {
            throw new Error('Invalid currency passed');
        }

        const url = window.location.href.replace(window.location.origin, '');
        const newLocaleUrl = this.#systemSdk.intl.localizeUrl(url, conf).toString();

        if (conf.currency) {
            this.#currentCurrency = conf.currency;
        }

        if (url !== newLocaleUrl) {
            this.#singleSpa.navigateToUrl(newLocaleUrl);
        } else {
            this.#triggerAppChange();
        }
    };

    #onBeforeAppsMount = () => {
        const prevConfig = this.#prevConfig;
        const currLocale = this.#systemSdk.intl.parseUrl(window.location.pathname).locale;
        if (
            this.#prevConfig.locale === currLocale &&
            this.#intlAdapterSystem.get().currency === this.#prevConfig.currency
        ) {
            return;
        }
        this.#prevConfig = this.#intlAdapterSystem.get();

        document.documentElement.lang = currLocale;

        const promises = [];
        const onAllResourcesReady = () => this.#iterablePromise(promises).then(() => this.#rollbackInProgress = false);
        const detail = Object.assign(this.getAdapter().get(), {
            addPendingResources: promise => promises.push(promise),
            onAllResourcesReady: onAllResourcesReady,
        });

        window.dispatchEvent(new CustomEvent('ilc:intl-update', {detail}));

        const afterAllResReady = onAllResourcesReady().catch(err => {
            console.warn(`ILC: error happened during change of the i18n configuration. See error details below. Rolling back...`);
            console.error(err);
            if (this.#rollbackInProgress === false) {
                this.#rollbackInProgress = true;
                this.#setIntl(prevConfig);
            } else {
                console.error(`ILC: error happened during i18n configuration change rollback... See error details above.`)
            }
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
