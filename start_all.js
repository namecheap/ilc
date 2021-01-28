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
    { command: `cd ./ilc/ && ${noWatch ? 'NODE_ENV=production' : ''} npm run ${noWatch ? 'start' : 'dev'}`, name: 'ilc' },
    { command: `cd ./registry/ && npm run ${noWatch ? 'start' : 'dev'}`, name: 'registry' },
];

if (!noWatch) {
    commands.push({ command: 'cd ./registry/client && npm run build:watch', name: 'registry:ui' });
}
if (runWithApps) {
    commands.push({ command: 'docker run --rm -p 8234-8240:8234-8240 namecheap/ilc-demo-apps:feature_app_wrappers', name: 'demo-apps' });
}

concurrently(commands, {
    prefix: 'name',
    killOthers: ['failure', 'success'],
}).then(() => {
    console.log('concurrently was finished successfully');
    process.exit(0);
}, (err) => {
    console.error('concurrently was finished with error');
    console.error(err);
    process.exit(1);
});
