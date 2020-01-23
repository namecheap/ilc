const extendError = require('@namecheap/error-extender');

const errors = {};
errors.TailorError = extendError('TailorError');
errors.FragmentError = extendError('FragmentError', { parent: errors.TailorError });
errors.FragmentWarn = extendError('FragmentWarn', { parent: errors.TailorError });

module.exports = Object.freeze(errors);
