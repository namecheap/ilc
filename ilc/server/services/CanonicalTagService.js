const IlcIntl = require('ilc-sdk/app').IlcIntl;
const { context } = require('../context/context');
const { removeQueryParams } = require('../../common/utils');

class CanonicalTagService {
    static getCanonicalTagForUrlAsHTML(url, locale, i18nConfig) {
        const store = context.getStore();
        const fullUrl = removeQueryParams(`${store.get('protocol')}://${store.get('domain')}${url}`);
        const localizedUrl = IlcIntl.localizeUrl(i18nConfig, fullUrl, { locale: locale || i18nConfig.default.locale });
        return `<link rel="canonical" href="${localizedUrl}" data-ilc="1" />`;
    }
}

module.exports = {
    CanonicalTagService,
};
