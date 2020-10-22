const UrlProcessor = require('../common/UrlProcessor');

let urlProcessor;

function getIlcUrlProcessor(trailingSlash) {
    if (urlProcessor === undefined && trailingSlash !== undefined) {
        urlProcessor = new UrlProcessor(trailingSlash);
    }

    return urlProcessor;
}

module.exports = getIlcUrlProcessor;
