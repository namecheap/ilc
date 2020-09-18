const _ = require('lodash');
const cookie = require('cookie');

const DEFAULT_LOCALE = 'en-US';
const SUPPORTED_LOCALES = [DEFAULT_LOCALE, 'en-GB', 'fr-FR']; // http://cldr.unicode.org/core-spec?tmpl=%2Fsystem%2Fapp%2Ftemplates
const SUPPORTED_LANGS = _.uniq(SUPPORTED_LOCALES.map(v => v.split('-')[0]));


async function onRequest(req, reply) {
    const routeLocale = getLocaleFromUrl(req.raw.url);
    if (routeLocale !== null) {
        req.raw.url = routeLocale.route;
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
    req.headers['z-lang'] = locale;
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
}
