'use strict';

const mergeConfigs = require('./merge-configs');
const parseOverrideConfig = require('./parse-override-config');
const config = require('config');

const TEMPLATE_ERROR = 0;
const TEMPLATE_NOT_FOUND = 1;

/**
 * Fetches the template from File System
 *
 * @param {string} templatesPath - The path where the templates are stored
 * @param {Object<ServerRouter>} router
 * @param {ConfigsInjector} configsInjector
 * @param {Object} newrelic
 */
module.exports = (templatesPath, router, configsInjector, newrelic, registryService) => async (
    request,
    parseTemplate
) => {
    const registryConfig = await registryService.getConfig();
    const overrideConfig = parseOverrideConfig(request.headers.cookie, config.get('overrideConfigTrustedOrigins'));
    if (overrideConfig) {
        registryConfig.data = mergeConfigs(registryConfig.data, overrideConfig);
    }

    const {route, page} = router.getTemplateInfo(registryConfig.data, request);
    const template = await registryService.getTemplate(route.template);

    if (template === undefined) {
        throw new Error('Can\'t match route base template to config map');
    }

    const routeName = route.route.replace(/^\/(.+)/, '$1');
    if (routeName) {
        newrelic.setTransactionName(routeName);
    }

    let baseTemplate = configsInjector.inject(request, registryConfig.data, template.data, route.slots);
    baseTemplate = baseTemplate.replace(/<ilc-slot\s+id="(.+)"\s*\/?>/gm, function (match, id) {
        return `<!-- Region "${id}" START -->\n` +
            `<div id="${id}"><slot name="${id}"></slot></div>\n` +
            `<script>window.ilcApps.push('${id}');</script>\n` +
            `<!-- Region "${id}" END -->`;
    });

    return parseTemplate(baseTemplate, page);
};

module.exports.TEMPLATE_ERROR = TEMPLATE_ERROR;
module.exports.TEMPLATE_NOT_FOUND = TEMPLATE_NOT_FOUND;
