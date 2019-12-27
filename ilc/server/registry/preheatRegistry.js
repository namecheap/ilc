const registryService = require('./registryService');

const preheatRegistry = async () => {
    console.log('Registry is preheating...');

    await Promise.all([
        registryService.getConfig(),
        registryService.getTemplate('500'),
    ]);

    console.log('Registry preheated successfully!');
}

module.exports = preheatRegistry;
