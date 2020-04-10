'use strict';

const mergeConfigs = require('./merge-configs');

const TEMPLATE_ERROR = 0;
const TEMPLATE_NOT_FOUND = 1;

/**
 * Fetches the template from File System
 *
 * @param {string} templatesPath - The path where the templates are stored
 * @param {Router} router
 * @param {ConfigsInjector} configsInjector
 * @param {Object} newrelic
 */
module.exports = (templatesPath, router, configsInjector, newrelic, registryService) => async (
    request,
    parseTemplate
) => {
    let registryConfig = await registryService.getConfig();

    const { cookie } = request.headers;
    try {
        let overrideConfig = typeof cookie === 'string' && cookie.split('; ').find(n => n.startsWith('overrideConfig'));
        if (overrideConfig) {
            overrideConfig = JSON.parse(overrideConfig.replace(/^overrideConfig=/, ''));
            mergeConfigs(registryConfig.data, overrideConfig);
        }
    } catch (e) {
        console.error('Can\'t handle overrideConfig from cookies', e);
    }

    const {route, page} = router.getTemplateInfo(registryConfig.data, request.url);
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
