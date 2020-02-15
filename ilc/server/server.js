'use strict';

/* eslint-disable no-process-exit */

const config = require('config');

const nginxConf = Object.assign({}, config.get('nginxRegistration'));
nginxConf.myAddr = nginxConf.myIp + (nginxConf.myPort ? `:${nginxConf.myPort}` : '');
nginxConf.apiAddrs = nginxConf.apiAddrs && nginxConf.apiAddrs.split(',');
const nginxReg = new (require('nginx-plus-dynamic-upstream'))(nginxConf, console);

function exitHandler(app) {
    return () => {
        console.log('Exit handler was called, trying to close the app...');

        app.close().then(() => {
            console.log('Successfully closed app server!');
            process.exit(0);
        }, (err) => {
            console.error('An error happened while trying to close app server', err);
            process.exit(7);
        });
    }
}

module.exports = app => {
    app.server.keepAliveTimeout = 5 * 60; //in seconds, should be higher then at load balancer

    process.on('SIGTERM', exitHandler(app));
    process.on('SIGINT', exitHandler(app));

    app.addHook('onClose', async () => {
        app.log.info('Shutting down HTTP server...');
        try {
            await nginxReg.exitHandler();
        } catch (err) {
            app.log.error('Error happened during unregistration in Nginx. Ending execution...');
            app.log.error(err);
        }
    });

    app.listen(config.get('port'), (err) => {
        if (err) {
            app.log.error(err);
            return process.exit(1);
        }

        nginxReg.initHandler().catch(err => {
            app.log.error('Error happened during registration in Nginx. Ending execution...');
            app.log.error(err);
            process.exit(8);
        });
    });
};
