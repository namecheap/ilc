import errorExtender from '@namecheap/error-extender';

export default {
    FetchIncludeError: errorExtender('FetchIncludeError', { defaultData: {} }),
    InvalidTemplateError: errorExtender('InvalidTemplateError', { defaultData: {} }),
    TemplateNotFoundError: errorExtender('TemplateNotFoundError', {
        defaultMessage: 'Template not found',
        defaultData: {},
    }),
};
