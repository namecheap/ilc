import { extendError } from '../utils';

export const RouterError = extendError('RouterError', { defaultData: {} });

export const TEMPLATE_NOT_FOUND_CODE = 1;

export const NoRouteMatchError = extendError('NoRouteMatchError', {
    parent: RouterError,
    defaultMessage: "Can't find matched route for passed path",
    defaultData: {
        code: TEMPLATE_NOT_FOUND_CODE,
        presentable: 'Template not found',
    },
});
export const NoBaseTemplateMatchError = extendError('NoBaseTemplateMatchError', {
    parent: RouterError,
    defaultMessage: "Can't determine base template for passed route",
    defaultData: {
        code: TEMPLATE_NOT_FOUND_CODE,
        presentable: 'Template not found',
        route: {},
    },
});
