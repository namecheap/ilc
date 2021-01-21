const Cookie = require('cookie');
const Intl = require('ilc-sdk/app').Intl;
const {intlSchema} = require('ilc-sdk/dist/server/IlcProtocol'); // "Private" import

const cookieEncoder = require('../common/i18nCookie');

const onRequestFactory = (i18nConfig, i18nParamsDetectionPlugin) => async (req, reply) => {
    if (!i18nConfig.enabled || req.raw.url === '/ping' || req.raw.url.startsWith('/_ilc/')) {
        return; // Excluding system routes
    }

    let currI18nConf = {...i18nConfig.default};

    const i18nCookie = Cookie.parse(req.headers.cookie || '')[cookieEncoder.name];
    if (i18nCookie) {
        const decodedCookie = cookieEncoder.decode(i18nCookie);
        currI18nConf.locale = Intl.getCanonicalLocale(decodedCookie.locale, i18nConfig.supported.locale) || currI18nConf.locale;
        currI18nConf.currency = i18nConfig.supported.currency.includes(decodedCookie.currency) ? decodedCookie.currency : currI18nConf.currency;
    }

    if (i18nParamsDetectionPlugin) {
        currI18nConf = await i18nParamsDetectionPlugin.detectI18nConfig(
            req.raw,
            {
                parseUrl: (url) => Intl.parseUrl(i18nConfig, url),
                localizeUrl: (url, {locale}) => Intl.localizeUrl(i18nConfig, url, {locale}),
                getCanonicalLocale: (locale) => Intl.getCanonicalLocale(locale, i18nConfig.supported.locale),
            },
            currI18nConf
        );
    } else if (!i18nCookie) {
        const routeLocale = Intl.parseUrl(i18nConfig, req.raw.url);
        if (routeLocale.locale !== i18nConfig.default.locale) { // URL can override locale only if it's not-default one
            currI18nConf.locale = routeLocale.locale;
        }
    }

    const fixedUrl = Intl.localizeUrl(i18nConfig, req.raw.url, {locale: currI18nConf.locale});
    if (fixedUrl !== req.raw.url) {
        reply.redirect(fixedUrl);
        return;
    }

    // Passing current locale to TailorX in order to render template properly
    req.raw.ilcState.locale = currI18nConf.locale;

    // Passing i18n data down to fragments
    req.headers['x-request-intl'] = intlSchema.toBuffer({
        ...i18nConfig,
        current: currI18nConf,
    }).toString('base64');

    if (i18nCookie !== cookieEncoder.encode(currI18nConf)) {
        reply.res.setHeader('Set-Cookie', Cookie.serialize(
            cookieEncoder.name,
            cookieEncoder.encode(currI18nConf),
            cookieEncoder.getOpts()
        ));
    }
};

/**
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
};
