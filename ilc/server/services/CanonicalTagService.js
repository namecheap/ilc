const config = require('config');
const IlcIntl = require('ilc-sdk/app').IlcIntl;
const { context } = require('../context/context');
const { removeQueryParams, addTrailingSlash } = require('../../common/utils');

class CanonicalTagService {
    static getCanonicalTagForUrlAsHTML(url, locale, i18nConfig) {
        const store = context.getStore();
        const fullUrl = removeQueryParams(`${config.get('client.protocol')}://${store.get('domain')}${url}`);
        const localizedUrl = IlcIntl.localizeUrl(i18nConfig, fullUrl, { locale: locale || i18nConfig.default.locale });
        return `<link rel="canonical" href="${addTrailingSlash(localizedUrl)}" data-ilc="1" />`;
    }
}

module.exports = {
    CanonicalTagService,
};
