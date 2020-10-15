const cookie = require('cookie');
const config = require('config');
const Intl = require('ilc-sdk/dist/app').Intl;

//TODO: should be moved to registry
const adapterConfig = {default: config.get('i18n.default'), supported: config.get('i18n.supported')};

async function onRequest(req, reply) {
    if (!config.get('i18n.enabled') || req.raw.url === '/ping' || req.raw.url.startsWith('/_ilc/')) {
        return; // Excluding system routes
    }

    const routeLocale = getLocaleFromUrl(req.raw.url);
    let locale = routeLocale.locale;
    if (routeLocale.locale === adapterConfig.default.locale) {
        const cookies = cookie.parse(req.headers.cookie || '');
        if (cookies.lang) { //TODO: clarify cookie name
            locale = Intl.getCanonicalLocale(cookies.lang, adapterConfig.supported.locale);
        }

        //TODO: add auth token based detection https://collab.namecheap.net/pages/viewpage.action?spaceKey=NA&title=How+to+Detect+Language+and+Culture
    }

    const fixedUrl = Intl.localizeUrl(adapterConfig, req.raw.url, { locale });
    if (fixedUrl !== req.raw.url) {
        reply.redirect(fixedUrl);
        return;
    }

    setReqLocale(req, locale);
}

function setReqLocale(req, locale) {
    req.raw.ilcState.locale = locale;
    req.headers['x-request-intl'] =
        `${locale}:${adapterConfig.default.locale}:${adapterConfig.supported.locale.join(',')};` +
        `USD:${config.get('i18n.default.currency')}:${config.get('i18n.supported.currency').join(',')};`;
}

function getLocaleFromUrl(url) {
    return Intl.parseUrl(adapterConfig, url);
}

module.exports = {
    onRequest,
    getLocaleFromUrl,
}
