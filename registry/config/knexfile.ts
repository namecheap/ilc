require('ts-node/register');

process.env.NODE_CONFIG_DIR = __dirname;
const config = require('config');

process.chdir('..');

module.exports = config.get('database');
