'use strict';

const PLUGIN_TYPES = {
    reporting: 'reporting',
    i18nParamsDetection: 'i18nParamsDetection',
    transitionHooks: 'transitionHooks',
};

module.exports = class PluginManager {
    #plugins = {};

    constructor(context) {
        this.#init(context);
    }

    getReportingPlugin() {
        return this.#plugins[PLUGIN_TYPES.reporting] || null;
    }

    getI18nParamsDetectionPlugin() {
        return this.#plugins[PLUGIN_TYPES.i18nParamsDetection] || null;
    }

    getTransitionHooksPlugin() {
        return this.#plugins[PLUGIN_TYPES.transitionHooks] || null;
    }

    // TODO: here we should be using common logger, however for it to work properly we need PluginManager...
    // and so we have circular dependency
    #init = (context) => {
        context.keys().forEach(pluginPath => {
            const module = context(pluginPath);
            const plugin = module.default || module;

            if (!Object.keys(PLUGIN_TYPES).includes(plugin.type)) {
                console.warn(`Plugin installed at path "${pluginPath}" of type "${plugin.type}" was ignored as it declares unsupported type.`);
                return;
            }

            if (this.#plugins[plugin.type] !== undefined) {
                console.warn(`Plugin installed at path "${pluginPath}" of type "${plugin.type}" was ignored as it duplicates the existing one.`);
                return;
            }

            console.info(`Enabling plugin "${pluginPath}" of type "${plugin.type}"...`);
            this.#plugins[plugin.type] = plugin;
        });
    }
};
module.exports.PLUGIN_TYPES = PLUGIN_TYPES;
