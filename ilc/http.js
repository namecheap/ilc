'use strict';

/* eslint-disable no-process-exit */

const config = require('config');

const nginxReg = new (require('nginx-plus-dynamic-upstream'))(config.get('nginxRegistration'), console);

// .extend adds a .withShutdown prototype method to the Server object
require('http-shutdown').extend();
const http = require('http');


/**
 * Create HTTP server.
 */
const server = http.createServer().withShutdown();
server.keepAliveTimeout = 5 * 60; //in seconds, should be higher then at load balancer

server.on('error', onError);
server.on('listening', onListening);

/**
 * Setup exit handlers
 */
process.on('SIGTERM', () => exitHandler());
process.on('SIGINT', () => exitHandler());
process.on('exit', () => exitHandler());

/**
 * Event listener for HTTP server "error" event.
 * @param {Error} error
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const addr = server.address();
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

    nginxReg.initHandler().catch(err => {
        global.console.error('Error happened during registration in Nginx. Ending execution...');
        global.console.error(err);
        process.exit(8);
    })
}

function exitHandler() {
    global.console.log('Shutting down HTTP server...');

    nginxReg.exitHandler().then(() => {
        server.shutdown(() => process.exit(7));
    }).catch(err => {
        global.console.error('Error happened during unregistration in Nginx. Ending execution...');
        global.console.error(err);
        server.shutdown(() => process.exit(9));
    });
}

module.exports = requestHandler => {
    server.on('request', requestHandler);
    server.listen(config.get('port'));
};