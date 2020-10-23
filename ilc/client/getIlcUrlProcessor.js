const initIlcConfig = require('./initIlcConfig').default;
const UrlProcessor = require('../common/UrlProcessor');

let urlProcessor;

function getIlcUrlProcessor() {
    if (urlProcessor === undefined) {
        const registryConf = initIlcConfig();
        urlProcessor = new UrlProcessor(registryConf.settings.trailingSlash);
    }

    return urlProcessor;
}

module.exports = getIlcUrlProcessor;
