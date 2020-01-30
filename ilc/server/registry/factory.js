const config = require('config');
const Registry = require('./Registry');
const wrapFetchWithCache = require('../../common/wrapWithCache');
const hashFn = require('../../common/hashFn');

module.exports = new Registry(
    config.get('registry.address'),
    wrapFetchWithCache(new Map(), console, hashFn),
    console
);
