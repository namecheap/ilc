import { extendError } from '../utils';

export const RouterError = extendError('RouterError', { defaultData: {} });

export const NoRouteMatchError = extendError('NoRouteMatchError', {
    parent: RouterError,
    defaultMessage: "Can't find matched route for passed path",
    defaultData: {
        code: 1, // 1 - TEMPLATE_NOT_FOUND
        presentable: 'Template not found',
    },
});
export const NoBaseTemplateMatchError = extendError('NoBaseTemplateMatchError', {
    parent: RouterError,
    defaultMessage: "Can't determine base template for passed route",
    defaultData: {
        code: 1, // 1 - TEMPLATE_NOT_FOUND
        presentable: 'Template not found',
    },
});
