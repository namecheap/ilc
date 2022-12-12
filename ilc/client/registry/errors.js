import extendError from '@namecheap/error-extender';

const errors = {};
errors.RegistryError = extendError('RegistryError');
errors.PreheatError = extendError('PreheatError', {
    parent: errors.RegistryError,
});

export default Object.freeze(errors);
