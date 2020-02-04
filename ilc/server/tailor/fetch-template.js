'use strict';

const TEMPLATE_ERROR = 0;
const TEMPLATE_NOT_FOUND = 1;


/**
 * Fetches the template from File System
 *
 * @param {string} templatesPath - The path where the templates are stored
 * @param {Router} router
 * @param {ConfigsInjector} configsInjector
 */
module.exports = (templatesPath, router, configsInjector) => async (
    request,
    parseTemplate
) => {
    const tplInfo = await router.getTemplateInfo(request.url);

    const baseTpl = await configsInjector.inject(tplInfo.base);

    const pageTemplate = tplInfo.page;

    return parseTemplate(baseTpl, pageTemplate);
};

module.exports.TEMPLATE_ERROR = TEMPLATE_ERROR;
module.exports.TEMPLATE_NOT_FOUND = TEMPLATE_NOT_FOUND;
