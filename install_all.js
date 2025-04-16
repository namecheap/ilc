const spawnSync = require('child_process').spawnSync;

const commands = [
    { command: 'cd ./ilc/ && npm ci', name: 'ilc' },
    { command: 'cd ./registry/ && npm ci', name: 'registry' },
    { command: 'cd ./registry/client && npm ci', name: 'registry:ui' },
    { command: 'cd ./e2e && npm ci', name: 'e2e' },
];

commands.forEach((cmd) => {
    console.log('');
    console.log('');

    spawnSync('npm config set network-concurrency 4', { shell: true });

    console.log(`Installing packages for "${cmd.name}"... Calling: ${cmd.command}`);
    console.log('');
    const res = spawnSync(cmd.command, { shell: true, killSignal: 'SIGKILL', stdio: 'inherit' });
    if (res.status !== 0) {
        throw new Error(
            `Error during packages installation for "${cmd.name}". Command "${cmd.command}" exited with code "${res.status}".`,
        );
    }
});
