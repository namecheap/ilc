class Environment {
    #env;

    #envVariableNames = {
        legacyPluginsDiscovery: 'LEGACY_PLUGINS_DISCOVERY',
    };

    constructor(env) {
        this.#env = env;
    }

    isLegacyPluginsDiscoveryEnabled() {
        return this.#env[this.#envVariableNames.legacyPluginsDiscovery] === 'false' ? false : true;
    }
}

module.exports = {
    Environment,
    environment: new Environment(process.env),
};
