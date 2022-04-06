const waitOn = require('wait-on');
const path = require('path');
const execa = require('execa').command;

const appPorts = {
    ilc: 8233,
    registry: 4001,
    navigation: 8235,
    people: 8236,
    planets: 8237,
    fetchWithCache: 8238,
    news: 8239,
    system: 8240,
    wrapper: 8234,
};

const resources = [
    `http-get://127.0.0.1:${appPorts.navigation}`,
    `http-get://127.0.0.1:${appPorts.people}`,
    `http-get://127.0.0.1:${appPorts.planets}`,
    `http-get://127.0.0.1:${appPorts.news}/_spa/dev/assets-discovery`,
    `http-get://127.0.0.1:${appPorts.system}/index.js`,
    `http-get://127.0.0.1:${appPorts.fetchWithCache}`,
    `http-get://127.0.0.1:${appPorts.ilc}/ping`,
    `http-get://127.0.0.1:${appPorts.registry}/ping`,
    `http-get://127.0.0.1:${appPorts.wrapper}/client-entry.js`,
];

let childProcess;

const shutDown = async () => {
    if (!childProcess || childProcess.exitCode !== null) {
        return;
    }

    console.log(`Killing child process...`);
    childProcess.kill('SIGTERM', { forceKillAfterTimeout: 3000 });

    await new Promise(resolve => {
        childProcess.once('exit', () => {
            console.log(`Child process was successfully killed. Shutting down...`);
            resolve();
        });
    });
};

const bootstrap = async () => {
    try {
        await new Promise((resolve, reject) => {
            const verbose = process.env.TEST_ENV === 'verbose';
            const stdio = verbose ? 'inherit' : 'ignore';

            console.log('Launching ILC with demo apps for E2E tests...');
            childProcess = execa(`npm run start -- --no-watch`, { cwd: path.join(__dirname, '..'), stdio });
            childProcess.once('error', (error) => {
                reject(error);
            });
            childProcess.once('exit', () => !childProcess.killed && reject(new Error('Child process exited...')));
            childProcess.catch(reject);

            waitOn({
                resources,
                timeout: 10 * 60 * 1000,
                interval: 1000,
                verbose: false,
            }).then(resolve).catch(reject);
        });
    } catch (error) {
        console.error('Error during bootstrap...');
        console.error(error);
        await shutDown();
        process.exit(1);
    }
};

const teardown = async () => shutDown();

module.exports = {
    bootstrap,
    teardown,
};
