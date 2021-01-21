import {Intl as IlcIntl} from 'ilc-sdk/app';
import Cookies from 'js-cookie';

import transactionManagerFactory from './TransactionManager';
import {appIdToNameAndSlot} from '../common/utils';
import i18nCookie from '../common/i18nCookie';
import dispatchSynchronizedEvent from './dispatchSynchronizedEvent';

export default class I18n {
    #config;
    #singleSpa;
    #appErrorHandlerFactory;
    #transactionManager;

    #prevConfig;

    constructor(
        config,
        singleSpa,
        appErrorHandlerFactory,
        transactionManager = undefined
    ) {
        this.#config = config;
        this.#singleSpa = singleSpa;
        this.#appErrorHandlerFactory = appErrorHandlerFactory;
        this.#transactionManager = transactionManager || transactionManagerFactory();

        this.#prevConfig = this.#get();

        window.addEventListener('single-spa:before-mount-routing-event', this.#onBeforeAppsMount);
    }

    unlocalizeUrl = v => IlcIntl.parseUrl(this.#config, v).cleanUrl;

    getAdapter() {
        return {
            set: this.#setIntl,
            get: () => this.#get(),
            config: this.#config,
        };
    }

    /**
     * Used only for tests
     */
    destroy() {
        window.removeEventListener('single-spa:before-mount-routing-event', this.#onBeforeAppsMount);
    }

    /**
     * @param {object} conf
     * @param {string} [conf.locale]
     * @param {string} [conf.currency]
     * @return void
     */
    #setIntl = (conf) => {
        if (conf.locale && !this.#config.supported.locale.includes(conf.locale)) {
            throw new Error('Invalid locale passed');
        }
        if (conf.currency && !this.#config.supported.currency.includes(conf.currency)) {
            throw new Error('Invalid currency passed');
        }
        conf = Object.assign(this.#get(), conf); //We need to fill the missing properties with curr values

        const url = window.location.href.replace(window.location.origin, '');
        const newLocaleUrl = IlcIntl.localizeUrl(this.#config, url, conf);

        this.#set(conf);

        if (url !== newLocaleUrl) {
            this.#singleSpa.navigateToUrl(newLocaleUrl);
        } else {
            this.#singleSpa.triggerAppChange();
        }
    };

    #onBeforeAppsMount = () => {
        const prevConfig = this.#prevConfig;
        const currLocale = IlcIntl.parseUrl(this.#config, window.location.pathname).locale;
        const currConfig = Object.assign(this.#get(), {locale: currLocale});
        if (
            currConfig.locale === prevConfig.locale &&
            currConfig.currency === prevConfig.currency
        ) {
            return;
        }

        this.#set(currConfig);
        this.#prevConfig = currConfig;

        const changeFlow = dispatchSynchronizedEvent(
            'ilc:intl-update',
            this.#get(),
            (actorId, ...args) => {
                const {appName, slotName} = appIdToNameAndSlot(actorId);
                const errorHandler = this.#appErrorHandlerFactory(appName, slotName);
                errorHandler(...args);
            }
        );

        this.#transactionManager.handleAsyncAction(changeFlow);
    };

    #get = () => i18nCookie.decode(Cookies.get(i18nCookie.name));

    #set = conf => {
        document.documentElement.lang = conf.locale;
        Cookies.set(i18nCookie.name, i18nCookie.encode(conf), i18nCookie.getOpts());
    }
}
