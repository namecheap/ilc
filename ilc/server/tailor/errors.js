const extendError = require('@namecheap/error-extender');

const errors = {};
errors.TailorError = extendError('TailorError', { defaultData: {} });
errors.FragmentError = extendError('FragmentError', { parent: errors.TailorError, defaultData: {} });
errors.FragmentRequestError = extendError('FragmentRequestError', { parent: errors.TailorError, defaultData: {} });
errors.FragmentWarn = extendError('FragmentWarn', { parent: errors.TailorError, defaultData: {} });
errors.Fragment404Response = extendError('Fragment404Response', { parent: errors.TailorError, defaultData: {} });

module.exports = Object.freeze(errors);
