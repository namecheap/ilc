const waitOn = require('wait-on');
const config = require('config');
const path = require('path');
const exec = require('child_process').exec;

const ports = [
    config.get('navigation.port'),
    config.get('people.port'),
    config.get('planets.port'),
    config.get('news.port'),
    config.get('system.port'),
    config.get('fetchWithCache.port'),
    config.get('port'),
    config.get('registry.port'),
];

let childProcess;

const forwardSignal = (signal) => {
    console.log(`Receive ${signal} signal.`);

    if (childProcess && !childProcess.kill(signal)) {
        console.log('Child process failed to stop.');
        return;
    }

    console.log('Child process was successfully stopped. Shutting down...');
};

const shutDown = (done) => {
    if (childProcess && !childProcess.killed) {
        childProcess.once('exit', () => done());
        forwardSignal('SIGINT');
    } else {
        done();
    }
}

const bootstrap = async (done) => {
    try {
        await new Promise((resolve, reject) => {
            childProcess = exec(`cd ${path.join(__dirname, '..')} && npm run start`, (error) => {
                if (error !== null) {
                    reject(error);
                }
            });

            waitOn({
                resources: ports.map((port) => `tcp:${port}`),
                timeout: 60*1000,
                simultaneous: 1,
                interval: 1000,
                delay: 5*1000,
            }).then(() => resolve()).catch((error) => {
                reject(error);
            });
        });

        done();
    } catch (error) {
        shutDown(() => done(error));
    }
};

const teardown = (done) => shutDown(() => done());

module.exports = {
    bootstrap,
    teardown,
}
