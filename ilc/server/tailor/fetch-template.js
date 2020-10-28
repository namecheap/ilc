'use strict';

const mergeConfigs = require('./merge-configs');
const parseOverrideConfig = require('./parse-override-config');
const config = require('config');
const {unlocalizeUrl} = require('../i18n');

const TEMPLATE_ERROR = 0;
const TEMPLATE_NOT_FOUND = 1;

/**
 * Fetches the template from File System
 *
 * @param {string} templatesPath - The path where the templates are stored
 * @param {Object<ServerRouter>} router
 * @param {ConfigsInjector} configsInjector
 * @param {Object} newrelic
 * @param {Registry} registryService
 */
module.exports = (templatesPath, router, configsInjector, newrelic, registryService) => async (
    request,
    parseTemplate
) => {
    let registryConfig = (await registryService.getConfig()).data;
    const overrideConfig = parseOverrideConfig(request.headers.cookie, config.get('overrideConfigTrustedOrigins'));
    if (overrideConfig) {
        registryConfig = mergeConfigs(registryConfig, overrideConfig);
    }

    const reqUrl = unlocalizeUrl(registryConfig.settings.i18n, request.url);
    const {route, page} = router.getTemplateInfo(registryConfig, reqUrl, request.ilcState);
    // Here we add contextual information about current route to the request
    // For now we use it only in "process-fragment-response.js" to check if we're already processing special route
    request.ilcRoute = route;
    const template = await registryService.getTemplate(route.template);

    if (template === undefined) {
        throw new Error('Can\'t match route base template to config map');
    }

    const routeName = route.route.replace(/^\/(.+)/, '$1');
    if (routeName) {
        newrelic.setTransactionName(routeName);
    }

    let baseTemplate = configsInjector.inject(request, registryConfig, template.data, route.slots);
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
