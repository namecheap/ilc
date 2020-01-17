const config = require('config');
const Registry = require('./Registry');
const wrapFetchWithCache = require('../../common/api/wrapFetchWithCache');

module.exports = new Registry(
    config.get('registry.address'),
    wrapFetchWithCache,
    console
);
