const fs = require('fs');
const spawnSync = require('child_process').spawnSync;

const commands = [
    { command: 'cd ./ilc/ && npm i', name: 'ilc' },
    { command: 'cd ./registry/ && npm i', name: 'registry' },
    { command: 'cd ./registry/client && npm i', name: 'registry:ui' },
    { command: 'cd ./adapters/vuejs/ && npm i', name: 'vuejs adapter' },
];

fs.readdirSync('./devFragments').forEach(fileName => {
    const stat = fs.lstatSync(`./devFragments/${fileName}`);
    if (stat.isFile()) {
        return;
    }

    commands.push({ command: `cd ./devFragments/${fileName}/ && npm i`, name: fileName });
});

commands.forEach(cmd => {
   console.log('');
   console.log('');
   console.log(`Installing packages for "${cmd.name}"... Calling: ${cmd.command}`);
   console.log('');
   spawnSync(cmd.command, {shell: true, timeout: 120000, killSignal: 'SIGKILL', stdio: 'inherit'});
});
