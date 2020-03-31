'use strict';

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
    const registryConfig = await registryService.getConfig();
    const {route, page} = router.getTemplateInfo(registryConfig.data, request.url);
    const template = await registryService.getTemplate(route.template);

    if (template === undefined) {
        throw new Error('Can\'t match route base template to config map');
    }

    const routeName = route.route.replace(/^\/(.+)/, '$1');
    if (routeName) {
        newrelic.setTransactionName(routeName);
    }

    const baseTemplate = configsInjector.inject(request, registryConfig.data, template.data, route.slots);

    return parseTemplate(baseTemplate, page);
};

module.exports.TEMPLATE_ERROR = TEMPLATE_ERROR;
module.exports.TEMPLATE_NOT_FOUND = TEMPLATE_NOT_FOUND;
