'use strict';

/* eslint-disable no-process-exit */

const config = require('config');

function exitHandler(app, type) {
    return () => {
        console.log(`Exit handler "${type}" was called, trying to close the app...`);

        app.close().then(
            () => {
                console.log('Successfully closed app server!');
                process.exit(0);
            },
            (err) => {
                console.error('An error happened while trying to close app server', err);
                process.exit(7);
            },
        );
    };
}

function getKeepAliveTimeoutMs() {
    const configuredValue = config.get('keepAliveTimeoutMs');
    // A number from default.json5, or a string from the ILC_KEEP_ALIVE_TIMEOUT_MS env variable
    const isUsableType =
        typeof configuredValue === 'number' || (typeof configuredValue === 'string' && configuredValue.trim() !== '');
    const keepAliveTimeoutMs = Number(configuredValue);

    if (!isUsableType || !Number.isInteger(keepAliveTimeoutMs) || keepAliveTimeoutMs < 0) {
        throw new TypeError(
            `Config "keepAliveTimeoutMs" (ILC_KEEP_ALIVE_TIMEOUT_MS) must be a non-negative integer of milliseconds, got: ${JSON.stringify(configuredValue)}`,
        );
    }

    return keepAliveTimeoutMs;
}

module.exports = (app) => {
    app.server.keepAliveTimeout = getKeepAliveTimeoutMs();

    process.on('SIGTERM', exitHandler(app, 'SIGTERM'));
    process.on('SIGINT', exitHandler(app, 'SIGINT'));

    app.listen({ port: config.get('port'), host: '0.0.0.0' }, (err) => {
        if (err) {
            app.log.error(err);
            return process.exit(1);
        }
    });
};
