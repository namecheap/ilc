const extendError = require('error-extender');

const errors = {};
errors.RouterError = extendError('RouterError');
errors.NoRouteMatchError = extendError('NoRouteMatchError', {
    parent: errors.RouterError,
    defaultMessage: 'Can\'t find matched route for passed path',
    defaultData: {
        code: 1, // 1 - TEMPLATE_NOT_FOUND
        presentable: 'Template not found'
    }
});

module.exports = Object.freeze(errors);