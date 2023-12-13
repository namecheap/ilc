const concurrently = require('concurrently');

let runWithApps = true;
let noWatch = false;

const myCmd = process.argv.slice(2).join(' ').trim();
if (myCmd.includes('--no-apps')) {
    runWithApps = false;
}
if (myCmd.includes('--no-watch')) {
    noWatch = true;
}

const commands = [
    {
        cwd: 'ilc',
        command: `${noWatch ? 'npx cross-env NODE_ENV=production' : ''} npm run ${noWatch ? 'start' : 'dev'}`,
        name: 'ilc',
    },
    {
        cwd: 'registry',
        command: `npm run migrate && npm run seed && npm run ${noWatch ? 'start' : 'dev'}`,
        name: 'registry',
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
    killSignal: 'SIGKILL',
    prefixColors: ['auto']
}).result.then(
    () => {
        console.log('concurrently was finished successfully');
        process.exit(0);
    },
    (err) => {
        console.error('concurrently was finished with error');
        process.exit(1);
    },
);
