const config = require('config');
const isStaticFile = (url) => {
    const extensions = ['.js', '.js.map'];

    return extensions.some((ext) => url.endsWith(ext));
};

const isHealthCheck = (url) => url === config.get('healthCheck.url');

module.exports = {
    isStaticFile,
    isHealthCheck,
};
