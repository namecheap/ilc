const _ = require('lodash');
const cookie = require('cookie');
const config = require('config');

const DEFAULT_LOCALE = config.get('i18n.default.locale'); //TODO: should be moved to registry
const SUPPORTED_LOCALES = config.get('i18n.supported.locale'); // http://cldr.unicode.org/core-spec?tmpl=%2Fsystem%2Fapp%2Ftemplates
const SUPPORTED_LANGS = _.uniq(SUPPORTED_LOCALES.map(v => v.split('-')[0]));


async function onRequest(req, reply) {
    if (!config.get('i18n.enabled') || req.raw.url === '/ping' || req.raw.url.startsWith('/_ilc/')) {
        return;
    }

    const routeLocale = getLocaleFromUrl(req.raw.url);
    if (routeLocale !== null) {
        if (routeLocale.locale === DEFAULT_LOCALE) {
            reply.redirect(routeLocale.route);
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

    locale = DEFAULT_LOCALE;
    setReqLocale(req, locale);
}

function setReqLocale(req, locale) {
    req.raw.ilcState.locale = locale;
    req.headers['x-request-intl'] =
        `${locale}:${DEFAULT_LOCALE}:${SUPPORTED_LOCALES.join(',')};` +
        `USD:${config.get('i18n.default.currency')}:${config.get('i18n.supported.currency').join(',')};`;
}

function getLocaleFromUrl(url) {
    let [, locale, ...route] = url.split('/');
    route = '/' + route.join('/');

    locale = getCanonicalLocale(locale);

    if (locale === null) {
        return null;
    }

    return { locale, route };
}

function getCanonicalLocale(locale) {
    try {
        const fixedLocale = Intl.getCanonicalLocales(locale);
        if (fixedLocale.length === 0) {
            return null;
        } else {
            locale = fixedLocale[0];
        }
    } catch (e) {
        return null;
    }

    if (SUPPORTED_LANGS.includes(locale)) {
        locale = SUPPORTED_LOCALES.find(v => v.split('-')[0] === locale);
    } else if (!SUPPORTED_LOCALES.includes(locale)) {
        return null;
    }

    return locale;
}

module.exports = {
    onRequest,
    getLocaleFromUrl,
}
