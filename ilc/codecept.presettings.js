const waitOn = require('wait-on');
const config = require('config');
const path = require('path');
const execa = require('execa').command;

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

const shutDown = (done) => {
    console.log(`Killing child process...`);
    childProcess.on('exit', () => {
        console.log(`Child process was successfully killed. Shutting down...`);
        done();
    });
    childProcess.kill('SIGINT', { forceKillAfterTimeout: 3000 });
};

const bootstrap = async (done) => {
    try {
        await new Promise((resolve, reject) => {
            childProcess = execa(`npm run start`, { cwd: path.join(__dirname, '..') });
            childProcess.on('error', (error) => {
                reject(error);
            });

            waitOn({
                resources: ports.map((port) => `tcp:localhost:${port}`),
                timeout: 60 * 1000,
                interval: 1000,
                delay: 5 * 1000,
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
};
