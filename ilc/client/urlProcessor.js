const registryConf = require('./initIlcConfig').default();
const UrlProcessor = require('../common/UrlProcessor');

module.exports = new UrlProcessor(registryConf.settings.trailingSlash);
