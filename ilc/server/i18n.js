const parseUrl = require('parseurl');
const Cookie = require('cookie');
const IlcIntl = require('ilc-sdk/app').IlcIntl;
const { intlSchema } = require('ilc-sdk');

const i18nCookie = require('../common/i18nCookie');

const isStaticFile = (url) => {
    const extensions = ['.js', '.js.map'];

    return extensions.some((ext) => url.endsWith(ext));
};

const onRequestFactory = (i18nConfig, i18nParamsDetectionPlugin) => async (req, reply) => {
    const parsedUrl = parseUrl(req.raw);

    if (!i18nConfig.enabled || req.raw.url === '/ping' || isStaticFile(parsedUrl.pathname)) {
        return; // Excluding system routes
    }

    const encodedI18nCookie = Cookie.parse(req.headers.cookie || '')[i18nCookie.name];
    const decodedI18nCookie = encodedI18nCookie && i18nCookie.decode(encodedI18nCookie);
    const initialI18nConfig = decodedI18nCookie
        ? processI18nFromCookie(decodedI18nCookie, i18nConfig)
        : i18nConfig.default;

    const pluginProcessedI18nConfig = await i18nParamsDetectionPlugin.detectI18nConfig(
        req.raw,
        {
            parseUrl: (url) => IlcIntl.parseUrl(i18nConfig, url),
            localizeUrl: (url, { locale }) => IlcIntl.localizeUrl(i18nConfig, url, { locale }),
            getCanonicalLocale: (locale) => IlcIntl.getCanonicalLocale(locale, i18nConfig.supported.locale),
            getSupportedCurrencies: async () => i18nConfig.supported.currency,
            getSupportedLocales: async () => i18nConfig.supported.locale,
            getDefaultCurrency: async () => i18nConfig.default.currency,
            getDefaultLocale: async () => i18nConfig.default.locale,
        },
        initialI18nConfig,
        decodedI18nCookie,
    );

    if (!req.raw.url.startsWith('/_ilc/')) {
        const fixedUrl = IlcIntl.localizeUrl(i18nConfig, req.raw.url, { locale: pluginProcessedI18nConfig.locale });
        if (fixedUrl !== req.raw.url) {
            reply.redirect(fixedUrl);
            return;
        }
    }

    // Passing current locale to TailorX in order to render template properly
    req.raw.ilcState.locale = pluginProcessedI18nConfig.locale;

    // Passing i18n data down to fragments
    req.headers['x-request-intl'] = intlSchema
        .toBuffer({
            ...i18nConfig,
            current: pluginProcessedI18nConfig,
        })
        .toString('base64');

    const encodedNextI18nCookie = i18nCookie.encode(pluginProcessedI18nConfig);

    if (encodedI18nCookie !== encodedNextI18nCookie) {
        reply.res.setHeader(
            'Set-Cookie',
            Cookie.serialize(i18nCookie.name, encodedNextI18nCookie, i18nCookie.getOpts()),
        );
    }
};

/**
 * Validates data in cookie and sets default if not valid
 * @param {object} cookie
 * @param {object} i18nConfig
 * @returns object
 */
function processI18nFromCookie(cookie, i18nConfig) {
    const locale = IlcIntl.getCanonicalLocale(cookie.locale, i18nConfig.supported.locale) ?? i18nConfig.default.locale;

    const currency = i18nConfig.supported.currency.includes(cookie.currency)
        ? cookie.currency
        : i18nConfig.default.currency;

    return { locale, currency };
}

/**
 * @param i18nConfig
 * @param {string} url
 * @return {string}
 */
function unlocalizeUrl(i18nConfig, url) {
    if (!i18nConfig.enabled) {
        return url;
    }

    return IlcIntl.parseUrl(i18nConfig, url).cleanUrl;
}

function localizeUrl(i18nConfig, url, configOverride) {
    if (!i18nConfig.enabled) {
        return url;
    }

    return IlcIntl.localizeUrl(i18nConfig, url, configOverride);
}

module.exports = {
    onRequestFactory,
    unlocalizeUrl,
    localizeUrl,
};
