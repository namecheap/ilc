'use strict';

const TEMPLATE_ERROR = 0;
const TEMPLATE_NOT_FOUND = 1;

/**
 * Fetches the template from File System
 *
 * @param {ConfigsInjector} configsInjector
 * @param {Object} newrelic
 * @param {Registry} registryService
 */
module.exports = (configsInjector, newrelic, registryService) => async (
    request,
    parseTemplate
) => {
    /** @type {ServerRouter} */
    const router = request.router;
    const childTemplate = router.getFragmentsTpl(request.ilcState);
    const currRoute = router.getRoute();

    const template = await registryService.getTemplate(currRoute.template);
    if (template === undefined) {
        throw new Error('Can\'t match route base template to config map');
    }

    const routeName = currRoute.route?.replace(/^\/(.+)/, '$1');
    if (routeName) {
        newrelic.setTransactionName(routeName);
    }

    let baseTemplate = configsInjector.inject(request, template.data, currRoute.slots);
    baseTemplate = baseTemplate.replace(/<ilc-slot\s+id="(.+)"\s*\/?>/gm, function (match, id) {
        return `<!-- Region "${id}" START -->\n` +
            `<div id="${id}"><slot name="${id}"></slot></div>\n` +
            `<script>window.ilcApps.push('${id}');</script>\n` +
            `<!-- Region "${id}" END -->`;
    });

    return parseTemplate(baseTemplate, childTemplate);
};

module.exports.TEMPLATE_ERROR = TEMPLATE_ERROR;
module.exports.TEMPLATE_NOT_FOUND = TEMPLATE_NOT_FOUND;
