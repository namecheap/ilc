const _ = require('lodash');

const fullRange = '(1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])';
const privateNetworks = [
  new RegExp(`^https?:\\/\\/10\\.${fullRange}\\.${fullRange}\\.${fullRange}`), // 10.0.0.0
  new RegExp(`^https?:\\/\\/192\\.168\\.${fullRange}\\.${fullRange}`), // 192.168.0.0
  new RegExp(`^https?:\\/\\/172\\.(1[6-9]|2[0-9]|3[01])\\.${fullRange}\\.${fullRange}`), // 172.16.0.0 - 172.31.255.255
  new RegExp('^https?:\\/\\/127\\.0\\.0\\.1'), // 127.0.0.1
];

const isPrivateNetwork = link => privateNetworks.some(re => re.test(link));
const isLink = text => typeof text === 'string' && /https?:\/\/?/.test(text);

const sanitizeSpoofedLinks = obj => {
    Object.entries(obj).forEach(([key, value]) => {
        if (_.isPlainObject(value)) {
          sanitizeSpoofedLinks(value);
        } else if (isLink(value) && !isPrivateNetwork(value)) {
          delete obj[key];
        }
    });
};

export default cookie => {
    try {
        let overrideConfig = typeof cookie === 'string' && cookie.split(';').find(n => n.trim().startsWith('ILC-overrideConfig'));
        if (overrideConfig) {
            overrideConfig = JSON.parse(decodeURIComponent(overrideConfig.replace(/^\s?ILC\-overrideConfig=/, '')));
            overrideConfig.apps && sanitizeSpoofedLinks(overrideConfig.apps);
            return overrideConfig;
        }
    } catch (e) {}
}
