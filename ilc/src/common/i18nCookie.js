const COOKIE_NAME = 'ilc-i18n';

function getCookieOpts() {
    return {
        path: '/',
        expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    }
}

function encode(val) {
    if (typeof val !== 'object' || !val.locale || !val.currency) {
        throw new Error(`Invalid format of the passed i18n data for encoding. Passed data: ${JSON.stringify(val)}`);
    }

    return `${val.locale}:${val.currency}`;
}

function decode(val) {
    const vals = val.split(':');
    if (vals.length < 2) {
        return {};
    }

    return {
        locale: vals[0],
        currency: vals[1],
    }
}
module.exports = {
    getOpts: getCookieOpts,
    name: COOKIE_NAME,
    encode,
    decode,
};
