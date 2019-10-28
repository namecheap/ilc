'use strict';

const _ = require('lodash');

function getSystemjsImportmap(apps) {
    const res = {};
    const deps = {};

    for (let appName in apps) {
        if (!apps.hasOwnProperty(appName)) {
            continue;
        }

        const app = apps[appName];

        res[appName] = app.spaBundle;

        if (app.dependencies !== undefined) {
            Object.assign(deps, app.dependencies);
        }
    }

    return `<script type="systemjs-importmap">${JSON.stringify({imports: Object.assign({}, res, deps)})}</script>`;
}

function getSPAConfig(registryConf) {
    registryConf.apps = _.mapValues(registryConf.apps, v => _.pick(v, ['cssBundle', 'props', 'initProps']));

    return `<script type="spa-config">${JSON.stringify(_.omit(registryConf, ['templates']))}</script>`;
}

module.exports = {
    getSystemjsImportmap,
    getSPAConfig
};