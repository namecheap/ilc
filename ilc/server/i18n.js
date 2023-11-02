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

    let decodedI18nCookie;
    let currI18nConf = { ...i18nConfig.default };

    const encodedI18nCookie = Cookie.parse(req.headers.cookie || '')[i18nCookie.name];

    if (encodedI18nCookie) {
        decodedI18nCookie = i18nCookie.decode(encodedI18nCookie);
        currI18nConf.locale =
            IlcIntl.getCanonicalLocale(decodedI18nCookie.locale, i18nConfig.supported.locale) || currI18nConf.locale;
        currI18nConf.currency = i18nConfig.supported.currency.includes(decodedI18nCookie.currency)
            ? decodedI18nCookie.currency
            : currI18nConf.currency;
    }

    currI18nConf = await i18nParamsDetectionPlugin.detectI18nConfig(
        req.raw,
        {
            parseUrl: (url) => IlcIntl.parseUrl(i18nConfig, url),
            localizeUrl: (url, { locale }) => IlcIntl.localizeUrl(i18nConfig, url, { locale }),
            getCanonicalLocale: (locale) => IlcIntl.getCanonicalLocale(locale, i18nConfig.supported.locale),
        },
        currI18nConf,
        decodedI18nCookie,
    );

    if (!req.raw.url.startsWith('/_ilc/')) {
        const fixedUrl = IlcIntl.localizeUrl(i18nConfig, req.raw.url, { locale: currI18nConf.locale });
        if (fixedUrl !== req.raw.url) {
            reply.redirect(fixedUrl);
            return;
        }
    }

    // Passing current locale to TailorX in order to render template properly
    req.raw.ilcState.locale = currI18nConf.locale;

    // Passing i18n data down to fragments
    req.headers['x-request-intl'] = intlSchema
        .toBuffer({
            ...i18nConfig,
            current: currI18nConf,
        })
        .toString('base64');

    const encodedNextI18nCookie = i18nCookie.encode(currI18nConf);

    if (encodedI18nCookie !== encodedNextI18nCookie) {
        reply.res.setHeader(
            'Set-Cookie',
            Cookie.serialize(i18nCookie.name, encodedNextI18nCookie, i18nCookie.getOpts()),
        );
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
