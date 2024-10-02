import { extendError } from '../util/extendError';

export default {
    FetchIncludeError: extendError('FetchIncludeError', { defaultData: {} }),
    InvalidTemplateError: extendError('InvalidTemplateError', { defaultData: {} }),
    TemplateNotFoundError: extendError('TemplateNotFoundError', {
        defaultMessage: 'Template not found',
        defaultData: {},
    }),
};
