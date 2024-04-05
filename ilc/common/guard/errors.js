const extendError = require('@namecheap/error-extender');

const errors = {};

errors.GuardError = extendError('GuardError', { defaultData: {} });
errors.GuardTransitionHookError = extendError('GuardTransitionHookError', {
    parent: errors.GuardError,
    defaultData: {},
});

module.exports = Object.freeze(errors);
