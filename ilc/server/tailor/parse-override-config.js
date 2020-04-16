const _ = require('lodash');
const CIDRMatcher = require('cidr-matcher');

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
const isLink = text => typeof text === 'string' && /^https?:\/\/?/.test(text);

const sanitizeSpoofedLinks = obj => {
    Object.entries(obj).forEach(([key, value]) => {
        if (_.isPlainObject(value)) {
          sanitizeSpoofedLinks(value);
        } else if (isLink(value) && !isPrivateNetwork(value)) {
          delete obj[key];
        }
    });
};

module.exports = cookie => {
    try {
        let overrideConfig = typeof cookie === 'string' && cookie.split(';').find(n => n.trim().startsWith('ILC-overrideConfig'));
        if (overrideConfig) {
            overrideConfig = JSON.parse(decodeURIComponent(overrideConfig.replace(/^\s?ILC-overrideConfig=/, '')));
            overrideConfig.apps && sanitizeSpoofedLinks(overrideConfig.apps);
            return overrideConfig;
        }
    } catch (e) {}
}
