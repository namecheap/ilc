'use strict';

const path = require('path');
const fg = require('fast-glob');

const TYPES = {
    reporting: 'reporting',
    i18nParamsDetection: 'i18nParamsDetection',
};

module.exports = class PluginManager {
    #plugins = {};

    constructor() {
        this.#init();
    }

    getReportingPlugin() {
        return this.#plugins[TYPES.reporting] || null;
    }

    getI18nParamsDetectionPlugin() {
        return this.#plugins[TYPES.i18nParamsDetection] || null;
    }

    //TODO: here we should be using common logger, however for it to work properly we need PluginManager...
    // and so we have circular dependency
    #init = () => {
        const entries = fg.sync(
            ['ilc-plugin-*/package.json', '@*/ilc-plugin-*/package.json'],
            {
                cwd: path.resolve(__dirname, '../../node_modules'),
                absolute: true,
            }
        );

        for (let pluginPath of entries) {
            const manifest = require(pluginPath);
            const pSource = require(path.resolve(entries[0], '..', manifest.main));

            if (!Object.keys(TYPES).includes(pSource.type)) {
                console.warn(`Plugin installed at path "${pluginPath}" of type "${pSource.type}" was ignored as ` +
                    `it declares unsupported type.`);
                continue;
            }

            if (this.#plugins[pSource.type] !== undefined) {
                console.warn(`Plugin installed at path "${pluginPath}" of type "${pSource.type}" was ignored as ` +
                    `it duplicates the existing one.`);
                continue;
            }

            console.info(`Enabling plugin "${manifest.name}" of type "${pSource.type}"...`);
            this.#plugins[pSource.type] = pSource;
        }
    }
};
