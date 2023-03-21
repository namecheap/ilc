const IlcIntl = require('ilc-sdk/app').IlcIntl;
const { context } = require('../context/context');
const { removeQueryParams } = require('../../common/utils');

class HrefLangService {
    #supportedLang = null;
    #i18nConfig = null;
    #defaultHrefLangValue = 'x-default';

    /**
     * *
     * @param i18nConfig Object
     */
    constructor(i18nConfig) {
        this.#supportedLang = i18nConfig?.supported?.locale || [];
        this.#i18nConfig = i18nConfig;
    }

    /**
     * *
     * @param url string
     * @return string
     */
    getHrefLangsForUrlAsHTML(url) {
        if (!this.#i18nConfig) {
            return '';
        }

        const localizedUrls = this.#supportedLang.map((lang) => {
            const localizedUrl = IlcIntl.localizeUrl(this.#i18nConfig, url, { locale: lang });
            const linkTag = this.#wrapUrlWithHrefLinkHTML(localizedUrl, lang);
            return linkTag;
        });

        const defaultUrl = IlcIntl.localizeUrl(this.#i18nConfig, url, { locale: this.#i18nConfig.default.locale });
        localizedUrls.push(this.#wrapUrlWithHrefLinkHTML(defaultUrl, this.#i18nConfig.default.locale, true));

        return localizedUrls.join('');
    }

    /**
     * *
     * @param url
     * @param langCulture
     * @param isDefault
     * @returns {string}
     */
    #wrapUrlWithHrefLinkHTML(url, langCulture, isDefault = false) {
        const store = context.getStore();
        const fullUrl = removeQueryParams(`${store.get('protocol')}://${store.get('domain')}${url}`);
        const defaultHrefLangValue = this.#defaultHrefLangValue;

        let hrefLangValue = isDefault ? defaultHrefLangValue : langCulture;

        if (typeof hrefLangValue !== 'string') {
            return '';
        } else {
            hrefLangValue = hrefLangValue.toLowerCase();
        }

        return `<link rel="alternate" hreflang="${hrefLangValue}" href="${fullUrl}" data-ilc="1" />`;
    }
}

module.exports = {
    HrefLangService,
};
