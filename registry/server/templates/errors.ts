import errorExtender from '@namecheap/error-extender';

export default {
    FetchIncludeError: errorExtender('FetchIncludeError', { defaultData: {} }),
    InvalidTemplateError: errorExtender('InvalidTemplateError', { defaultData: {} }),
};
