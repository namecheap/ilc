'use strict';

/* eslint-disable no-process-exit */
import config from 'config';

// .extend adds a .withShutdown prototype method to the Server object
require('http-shutdown').extend();
const http = require('http');

/**
 * Create HTTP server.
 */
const server = http.createServer().withShutdown();

server.on('error', onError);
server.on('listening', onListening);

/**
 * Setup exit handlers
 */
process.on('SIGTERM', exitHandler);
process.on('SIGINT', exitHandler);

/**
 * Event listener for HTTP server "error" event.
 * @param {Error} error
 */
function onError(error: any) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const addr = server.address();
    if (addr == null) {
        throw error;
    }

    const bind = typeof addr === 'string' ? 'Pipe ' + addr : 'Port ' + addr.port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            global.console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;

        case 'EADDRINUSE':
            global.console.error(bind + ' is already in use');
            process.exit(1);
            break;

        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    global.console.log('Listening on ' + bind);
}

function exitHandler(signal: string) {
    global.console.log(`Exit handler "${signal}" was called, trying to close the HTTP server...`);
    server.shutdown(() => process.exit(0));
}

export default (requestHandler: any) => {
    let keepAliveTimeout: number;

    try {
        keepAliveTimeout = parseInt(config.get('keepAliveTimeout'));
    } catch (err) {
        throw new Error('Invalid keepAliveTimeout value in config. Exiting.');
    }

    server.keepAliveTimeout = keepAliveTimeout;

    server.on('request', requestHandler);
    server.listen(config.get('port'));
};
