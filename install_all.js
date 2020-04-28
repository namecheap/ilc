const spawnSync = require('child_process').spawnSync;

const commands = [
    { command: 'cd ./ilc/ && npm i', name: 'ilc' },
    { command: 'cd ./registry/ && npm i', name: 'registry' },
    { command: 'cd ./registry/client && npm i', name: 'registry:ui' },
    { command: 'cd ./e2e && npm i', name: 'e2e' },
];

commands.forEach(cmd => {
   console.log('');
   console.log('');
   console.log(`Installing packages for "${cmd.name}"... Calling: ${cmd.command}`);
   console.log('');
   spawnSync(cmd.command, {shell: true, timeout: 120000, killSignal: 'SIGKILL', stdio: 'inherit'});
});
