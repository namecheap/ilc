const fs = require('fs');
const concurrently = require('concurrently');

const commands = [
    { command: 'cd ./ilc/ && npm run dev', name: 'ilc' },
    { command: 'cd ./registry/ && npm run dev', name: 'registry' },
    { command: 'cd ./registry/client && npm run build:watch', name: 'registry:ui' },
];

fs.readdirSync('./devFragments').forEach(fileName => {
    const stat = fs.lstatSync(`./devFragments/${fileName}`);
    if (stat.isFile()) {
        return;
    }

    commands.push({ command: `cd ./devFragments/${fileName}/ && npm run dev`, name: fileName });
});

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
