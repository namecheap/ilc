const _ = require('lodash');
const CIDRMatcher = require('cidr-matcher');
const isUrl = require('is-url');

const privateNetworks = new CIDRMatcher([
    '10.0.0.0/8',
    '192.168.0.0/16',
    '172.16.0.0/12',
    '127.0.0.0/8',
]);

const isPrivateNetwork = link => {
    const matchedIp = link.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    return matchedIp && matchedIp[0] && privateNetworks.contains(matchedIp[0]);
}

const isTrustDomain = (link, trustDomains) => {
    if (!trustDomains) return false;

    const linkWoProtocol = link.trim().replace(/(^\w+:|^)\/\//, '');
    return trustDomains.some(trustDomain => linkWoProtocol.startsWith(trustDomain));
};

const sanitizeSpoofedLinks = (obj, trustDomains) => {
    Object.entries(obj).forEach(([key, value]) => {
        if (_.isPlainObject(value)) {
          sanitizeSpoofedLinks(value, trustDomains);
        } else if (typeof value === 'string' && isUrl(value.trim())) {
            !isPrivateNetwork(value) && !isTrustDomain(value, trustDomains) && delete obj[key];
        }
    });
};

module.exports = (cookie, trustDomains) => {
    try {
        let overrideConfig = typeof cookie === 'string' && cookie.split(';').find(n => n.trim().startsWith('ILC-overrideConfig'));
        if (overrideConfig) {
            overrideConfig = JSON.parse(decodeURIComponent(overrideConfig.replace(/^\s?ILC-overrideConfig=/, '')));
            if (overrideConfig.apps && trustDomains !== 'all') {
                const parsedTrustDomains = typeof trustDomains === 'string' && trustDomains.split(',').map(n=>n.trim());
                sanitizeSpoofedLinks(overrideConfig.apps, parsedTrustDomains);
            }
            return overrideConfig;
        }
    } catch (e) {}
}
