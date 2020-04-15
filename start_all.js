const concurrently = require('concurrently');

let runWithApps = true;

const myCmd = process.argv.slice(2).join(' ').trim();
if (myCmd.includes('--no-apps')) {
    runWithApps = false;
}

const commands = [
    { command: 'cd ./ilc/ && npm run dev', name: 'ilc' },
    { command: 'cd ./registry/ && npm run dev', name: 'registry' },
    { command: 'cd ./registry/client && npm run build:watch', name: 'registry:ui' },
];

if (runWithApps) {
    commands.push({ command: 'docker run --rm -p 8235-8240:8235-8240 namecheap/ilc-demo-apps', name: 'demo-apps' });
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
