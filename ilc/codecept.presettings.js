const waitOn = require('wait-on');
const config = require('config');
const path = require('path');
const exec = require('child_process').exec;

const apps = {
    registry: {
        port: 4001
    },
    navigation: {
        port: 8235
    },
    people: {
        port: 8236
    },
    planets: {
        port: 8237
    },
    fetchWithCache: {
        port: 8238
    },
    news: {
        port: 8239
    },
    system: {
        port: 8240
    }
};

const ports = [
    apps.navigation.port,
    apps.people.port,
    apps.planets.port,
    apps.news.port,
    apps.system.port,
    apps.fetchWithCache.port,
    config.get('port'),
    apps.registry.port,
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
