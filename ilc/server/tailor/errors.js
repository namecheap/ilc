const extendError = require('@namecheap/error-extender');

const errors = {};
errors.TailorError = extendError('TailorError', { defaultData: {} });
errors.FragmentError = extendError('FragmentError', { parent: errors.TailorError });
errors.FragmentRequestError = extendError('FragmentRequestError', { parent: errors.TailorError });
errors.FragmentWarn = extendError('FragmentWarn', { parent: errors.TailorError });
errors.Fragment404Response = extendError('Fragment404Response', { parent: errors.TailorError });

module.exports = Object.freeze(errors);
