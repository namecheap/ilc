import { extendError } from '../../common/utils';

const errors = {};
errors.RegistryError = extendError('RegistryError');
errors.PreheatError = extendError('PreheatError', {
    parent: errors.RegistryError,
});

export default Object.freeze(errors);
