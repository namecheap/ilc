'use strict';

const {PassThrough} = require('stream');
const pluginManager = require('../pluginManager/factory');
const pino = require('pino');

let logger = pluginManager.getLogger();
if (logger === null) {
    let destStream = process.stdout;
    // We need this to being able to capture stdout of the app.
    // As for pure "process.stdout" uses faster logs output via sonic-boom
    // which is hard to intercept
    if (process.env.NODE_ENV === 'test') {
        destStream = new PassThrough();
        destStream.pipe(process.stdout);
    }
    logger = pino(require('./defaultLoggerConf'), destStream);
}

module.exports = logger;
