const extendError = require('@namecheap/error-extender');

const errors = {};

errors.GuardError = extendError('GuardError', { defaultData: {} });
errors.GuardTransitionHookError = extendError('GuardTransitionHookError', {
    parent: errors.GuardError,
});

module.exports = Object.freeze(errors);
