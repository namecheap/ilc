import {Intl as IlcIntl} from 'ilc-sdk/dist/app';
import transactionManagerFactory from '../TransactionManager';
import {triggerAppChange} from '../navigationEvents';
import {iterablePromise} from '../utils';

export default class I18n {
    #transactionManager;
    #adapterConfig;
    #prevConfig;
    #singleSpa;
    #rollbackInProgress = false;
    #triggerAppChange;
    #currentCurrency = 'USD'; //TODO: to be changes in future

    constructor(
        adapterConfig,
        singleSpa,
        triggerAppsChange = triggerAppChange,
        transactionManager = transactionManagerFactory()
    ) {
        this.#transactionManager = transactionManager;
        this.#adapterConfig = adapterConfig;
        this.#triggerAppChange = triggerAppsChange;
        this.#singleSpa = singleSpa;
        this.#prevConfig = this.getAdapter().get();

        window.addEventListener('single-spa:before-mount-routing-event', this.#onBeforeAppsMount);
    }

    unlocalizeUrl = v => IlcIntl.parseUrl(this.#adapterConfig, v).cleanUrl;

    getAdapter() {
        return {
            set: this.#setIntl,
            get: () => ({locale: document.documentElement.lang, currency: this.#currentCurrency}),
            config: this.#adapterConfig,
        };
    }

    /**
     * @param {object} conf
     * @param {string} [conf.locale]
     * @param {string} [conf.currency]
     * @return void
     */
    #setIntl = (conf) => {
        if (conf.locale && !this.#adapterConfig.supported.locale.includes(conf.locale)) {
            throw new Error('Invalid locale passed');
        }
        if (conf.currency && !this.#adapterConfig.supported.currency.includes(conf.currency)) {
            throw new Error('Invalid currency passed');
        }

        const url = window.location.href.replace(window.location.origin, '');
        const newLocaleUrl = IlcIntl.localizeUrl(this.#adapterConfig, url, conf);

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
        const currLocale = IlcIntl.parseUrl(this.#adapterConfig, window.location.pathname).locale;
        if (
            this.#prevConfig.locale === currLocale &&
            this.getAdapter().get().currency === this.#prevConfig.currency
        ) {
            return;
        }

        document.documentElement.lang = currLocale;
        this.#prevConfig = this.getAdapter().get();

        const promises = [];
        const onAllResourcesReady = () => iterablePromise(promises).then(() => this.#rollbackInProgress = false);
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
        this.#transactionManager.handleAsyncAction(afterAllResReady);

        return afterAllResReady;
    };
}
