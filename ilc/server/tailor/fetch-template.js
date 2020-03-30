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
module.exports = (templatesPath, router, configsInjector, newrelic) => async (
    request,
    parseTemplate
) => {
    const templateInfo = await router.getTemplateInfo(request.url);

    const routeName = templateInfo.route.route.replace(/^\/(.+)/, '$1');
    if (routeName) {
        newrelic.setTransactionName(routeName);
    }

    const baseTemplate = configsInjector.inject(request, templateInfo);

    return parseTemplate(baseTemplate, templateInfo.page);
};

module.exports.TEMPLATE_ERROR = TEMPLATE_ERROR;
module.exports.TEMPLATE_NOT_FOUND = TEMPLATE_NOT_FOUND;
