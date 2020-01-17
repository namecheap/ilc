const config = require('config');
const Registry = require('./Registry');
const wrapFetchWithCache = require('../../common/wrapWithCache');

module.exports = new Registry(
    config.get('registry.address'),
    wrapFetchWithCache,
    console
);
