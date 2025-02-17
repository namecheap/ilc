const concurrently = require('concurrently');

let runWithApps = true;
let noWatch = false;
let noSeed = false;

const myCmd = process.argv.slice(2).join(' ').trim();
if (myCmd.includes('--no-apps')) {
    runWithApps = false;
}
if (myCmd.includes('--no-watch')) {
    noWatch = true;
}
if (myCmd.includes('--no-seed')) {
    noSeed = true;
}

const commands = [
    {
        cwd: 'ilc',
        command: `${noWatch ? 'npx cross-env NODE_ENV=production' : ''} npm run ${noWatch ? 'start' : 'dev'}`,
        name: 'ilc',
    },
    {
        cwd: 'registry',
        command: `npm run migrate ${noSeed ? '' : '&& npm run seed'} && npm run ${noWatch ? 'start' : 'dev'}`,
        name: 'registry',
    },
    {
        cwd: 'registry',
        command: 'npx ts-node lde/oauth-server.ts',
        name: 'oauth-server',
    },
];

if (!noWatch) {
    commands.push({ cwd: 'registry/client', command: 'npm run build:watch', name: 'registry:ui' });
}
if (runWithApps) {
    commands.push({
        command:
            'docker rm -f ilc-demo-apps && docker pull namecheap/ilc-demo-apps && docker run --rm --name ilc-demo-apps -p 8234-8240:8234-8240 namecheap/ilc-demo-apps',
        name: 'demo-apps',
    });
}

concurrently(commands, {
    prefix: 'name',
    killOthers: ['failure', 'success'],
    killSignal: 'SIGTERM',
    prefixColors: ['auto'],
}).result.then(
    () => {
        console.log('concurrently was finished successfully');
        process.exit(0);
    },
    (err) => {
        console.error('concurrently was finished with error', err);
        process.exit(1);
    },
);
