const { extendError } = require('../utils');

const errors = {};
errors.RouterError = extendError('RouterError', { defaultData: {} });
errors.NoRouteMatchError = extendError('NoRouteMatchError', {
    parent: errors.RouterError,
    defaultMessage: "Can't find matched route for passed path",
    defaultData: {
        code: 1, // 1 - TEMPLATE_NOT_FOUND
        presentable: 'Template not found',
    },
});
errors.NoBaseTemplateMatchError = extendError('NoBaseTemplateMatchError', {
    parent: errors.RouterError,
    defaultMessage: "Can't determine base template for passed route",
    defaultData: {
        code: 1, // 1 - TEMPLATE_NOT_FOUND
        presentable: 'Template not found',
    },
});

module.exports = Object.freeze(errors);
