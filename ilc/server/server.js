'use strict';

/* eslint-disable no-process-exit */

const config = require('config');

const nginxConf = Object.assign({}, config.get('nginxRegistration'));
nginxConf.myAddr = nginxConf.myIp + (nginxConf.myPort ? `:${nginxConf.myPort}` : '');
nginxConf.apiAddrs = nginxConf.apiAddrs && nginxConf.apiAddrs.split(',');
const nginxReg = new (require('nginx-plus-dynamic-upstream'))(nginxConf, console);

function exitHandler(app, type) {
    return () => {
        console.log(`Exit handler "${type}" was called, trying to close the app...`);

        nginxReg.exitHandler()
            .then(() => app.close())
            .then(() => {
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

    process.on('SIGTERM', exitHandler(app, 'SIGTERM'));
    process.on('SIGINT', exitHandler(app, 'SIGINT'));

    app.listen(config.get('port'), '0.0.0.0', (err) => {
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
