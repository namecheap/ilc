import { command as execa, ExecaChildProcess } from 'execa';
import path from 'path';
import terminate from 'terminate';
import waitOn from 'wait-on';

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
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.navigation}`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.people}`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.planets}`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.news}/_spa/dev/assets-discovery`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.system}/index.js`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.fetchWithCache}`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.ilc}/ping`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.registry}/ping`,
    `http-get://${process.env.ILC_HOST || '127.0.0.1'}:${appPorts.wrapper}/client-entry.js`,
];

let childProcess: ExecaChildProcess<string>;

async function shutdown() {
    if (!childProcess || childProcess.exitCode !== null) {
        return;
    }

    console.info(`Killing child process...`);
    terminate(childProcess.pid!, 'SIGTERM', { timeout: 3000 }, (err) => {
        terminate(childProcess.pid!);
    });
}

export async function bootstrap() {
    try {
        await new Promise((resolve, reject) => {
            const isVerbose = process.argv.includes('--verbose');
            const stdio = isVerbose ? 'inherit' : 'ignore';

            console.log('Launching ILC with demo apps for E2E tests...');
            childProcess = execa(`npm run start -- --no-watch`, { cwd: path.join(__dirname, '..'), stdio });
            childProcess.once('error', (error) => {
                reject(error);
            });
            childProcess.once(
                'exit',
                (code, signal) =>
                    !childProcess.killed &&
                    reject(new Error(`Child process exited... with code ${code} and signal ${signal}`)),
            );
            childProcess.catch(reject);

            waitOn({
                resources,
                timeout: 10 * 60 * 1000,
                interval: 1000,
                verbose: true,
            })
                .then(resolve)
                .catch(reject);
        });
    } catch (error) {
        console.error('Error during bootstrap...');
        console.error(error);
        await shutdown();
        process.exit(1);
    }
}

export const teardown = async () => shutdown();
