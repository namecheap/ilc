const cookie = require('cookie');
const config = require('config');
const Intl = require('ilc-sdk/dist/app').Intl;

const DEFAULT_LOCALE = config.get('i18n.default.locale'); //TODO: should be moved to registry
const SUPPORTED_LOCALES = config.get('i18n.supported.locale'); // http://cldr.unicode.org/core-spec?tmpl=%2Fsystem%2Fapp%2Ftemplates


async function onRequest(req, reply) {
    if (!config.get('i18n.enabled') || req.raw.url === '/ping' || req.raw.url.startsWith('/_ilc/')) {
        return;
    }

    const routeLocale = getLocaleFromUrl(req.raw.url);
    if (routeLocale !== null) {
        if (routeLocale.locale === DEFAULT_LOCALE && req.raw.url !== routeLocale.cleanUrl) {
            reply.redirect(routeLocale.cleanUrl);
            return;
        }

        setReqLocale(req, routeLocale.locale);
        return;
    }

    let locale = null;
    const cookies = cookie.parse(req.headers.cookie || '');
    if (cookies.lang) { //TODO: clarify cookie name
        locale = getCanonicalLocale(cookies.lang);
    }

    //TODO: add auth token based detection https://collab.namecheap.net/pages/viewpage.action?spaceKey=NA&title=How+to+Detect+Language+and+Culture

    if (locale !== null && locale !== DEFAULT_LOCALE) {
        reply.redirect(`/${locale}${req.raw.url}`);
        return;
    }

    setReqLocale(req, DEFAULT_LOCALE);
}

function setReqLocale(req, locale) {
    req.raw.ilcState.locale = locale;
    req.headers['x-request-intl'] =
        `${locale}:${DEFAULT_LOCALE}:${SUPPORTED_LOCALES.join(',')};` +
        `USD:${config.get('i18n.default.currency')}:${config.get('i18n.supported.currency').join(',')};`;
}

function getLocaleFromUrl(url) {
    return Intl.parseUrl(url, DEFAULT_LOCALE, SUPPORTED_LOCALES);
}

function getCanonicalLocale(locale) {
    return Intl.getCanonicalLocale(locale, SUPPORTED_LOCALES);
}

module.exports = {
    onRequest,
    getLocaleFromUrl,
}
