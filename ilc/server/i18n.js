const cookie = require('cookie');
const Intl = require('ilc-sdk/app').Intl;

const onRequestFactory = (i18nConfig) => async (req, reply) => {
    if (!i18nConfig.enabled || req.raw.url === '/ping' || req.raw.url.startsWith('/_ilc/')) {
        return; // Excluding system routes
    }

    const routeLocale = Intl.parseUrl(i18nConfig, req.raw.url);
    let locale = routeLocale.locale;
    if (routeLocale.locale === i18nConfig.default.locale) {
        const cookies = cookie.parse(req.headers.cookie || '');
        if (cookies.lang) { //TODO: clarify cookie name
            locale = Intl.getCanonicalLocale(cookies.lang, i18nConfig.supported.locale) || locale;
        }

        //TODO: add auth token based detection https://collab.namecheap.net/pages/viewpage.action?spaceKey=NA&title=How+to+Detect+Language+and+Culture
    }

    const fixedUrl = Intl.localizeUrl(i18nConfig, req.raw.url, { locale });
    if (fixedUrl !== req.raw.url) {
        reply.redirect(fixedUrl);
        return;
    }

    req.raw.ilcState.locale = locale;
    req.headers['x-request-intl'] =
        `${locale}:${i18nConfig.default.locale}:${i18nConfig.supported.locale.join(',')};` +
        `USD:${i18nConfig.default.currency}:${i18nConfig.supported.currency.join(',')};`;
}

/**
 *
 * @param i18nConfig
 * @param {string} url
 * @return {string}
 */
function unlocalizeUrl(i18nConfig, url) {
    if (!i18nConfig.enabled) {
        return url;
    }

    return Intl.parseUrl(i18nConfig, url).cleanUrl;
}

module.exports = {
    onRequestFactory,
    unlocalizeUrl,
}
