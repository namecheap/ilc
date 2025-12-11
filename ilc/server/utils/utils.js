const config = require('config');
const isStaticFile = (url) => {
    const extensions = ['.js', '.js.map'];

    return extensions.some((ext) => url.endsWith(ext));
};

const isHealthCheck = (url) => url === config.get('healthCheck.url');

const isDataUri = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }

    let normalized = url.trim();

    try {
        normalized = decodeURIComponent(normalized);
    } catch (e) {}

    normalized = normalized.toLowerCase();

    normalized = normalized.replace(/^\/+/, '');

    return normalized.startsWith('data:');
};

module.exports = {
    isStaticFile,
    isHealthCheck,
    isDataUri,
};
