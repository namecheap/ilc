const _ = require('lodash');
const CIDRMatcher = require('cidr-matcher');
const isUrl = require('is-url');
const LZUTF8 = require('lzutf8');

const privateNetworks = new CIDRMatcher(['10.0.0.0/8', '192.168.0.0/16', '172.16.0.0/12', '127.0.0.0/8']);

const isPrivateNetwork = (link) => {
    const matchedIp = link.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    return matchedIp && matchedIp[0] && privateNetworks.contains(matchedIp[0]);
};

const isTrustedOrigin = (link, trustedOrigins) => {
    if (!trustedOrigins) {
        trustedOrigins = [];
    }
    trustedOrigins.push('localhost');

    const linkWoProtocol = link.trim().replace(/(^\w+:|^)\/\//, '');

    return trustedOrigins.some((trustedOrigin) => {
        const isTrustedLink = linkWoProtocol.startsWith(trustedOrigin + '/');
        if (isTrustedLink) {
            return true;
        }

        const isTrustedLinkWithPort = linkWoProtocol.startsWith(trustedOrigin + ':');
        if (isTrustedLinkWithPort) {
            return true;
        }

        const hostname = linkWoProtocol.replace(/(:|\/).*$/, '');
        const levelsOfLink = hostname.split('.');
        const isTrustedLinkWithSubdomain = trustedOrigin
            .split('.')
            .every((levelDomain, index) => levelDomain === '*' || levelDomain === levelsOfLink[index]);
        if (isTrustedLinkWithSubdomain) {
            return true;
        }

        return false;
    });
};

const sanitizeSpoofedLinks = (obj, trustedOrigins) => {
    Object.entries(obj).forEach(([key, value]) => {
        if (_.isPlainObject(value)) {
            sanitizeSpoofedLinks(value, trustedOrigins);
        } else if (typeof value === 'string' && isUrl(value.trim())) {
            !isPrivateNetwork(value) && !isTrustedOrigin(value, trustedOrigins) && delete obj[key];
        }
    });
};

module.exports = (cookie, trustedOrigins) => {
    try {
        let overrideConfig =
            typeof cookie === 'string' && cookie.split(';').find((n) => n.trim().startsWith('ILC-overrideConfig'));
        if (!overrideConfig) {
            return null;
        }
        overrideConfig = overrideConfig.replace(/^\s?ILC-overrideConfig=/, '');

        // We support https://github.com/rotemdan/lzutf8.js compression here to ensure we can fit cookie into 4096 bytes
        // in majority of the cases
        if (overrideConfig.startsWith('LZUTF8:')) {
            overrideConfig = overrideConfig.replace(/^LZUTF8:/, '');
            overrideConfig = JSON.parse(LZUTF8.decompress(LZUTF8.decodeBase64(overrideConfig)));
        } else {
            overrideConfig = JSON.parse(decodeURIComponent(overrideConfig));
        }

        if (trustedOrigins !== 'all') {
            const parsedTrustedOrigin =
                typeof trustedOrigins === 'string' && trustedOrigins.split(',').map((n) => n.trim());

            if (overrideConfig.apps) {
                sanitizeSpoofedLinks(overrideConfig.apps, parsedTrustedOrigin);
            }

            if (overrideConfig.sharedLibs) {
                sanitizeSpoofedLinks(overrideConfig.sharedLibs, parsedTrustedOrigin);
            }
        }

        /**
         * The following logic needs to ignore invalid SSL certificates for sources that use HTTPS protocol
         * It ignores certificates only when a developer uses LDE to work with ILC on production environment
         * Due to TailorX can not fetch necessary fragment information for SSR from local environment
         */
        if (overrideConfig.apps !== undefined) {
            for (let appName in overrideConfig.apps) {
                const ssr = overrideConfig.apps[appName].ssr;

                if (ssr !== undefined && ssr.src !== undefined && ssr.src.startsWith('https:')) {
                    overrideConfig.apps[appName].ssr.ignoreInvalidSsl = true;
                }
            }
        }

        return overrideConfig;
    } catch (e) {
        return null;
    }
};
