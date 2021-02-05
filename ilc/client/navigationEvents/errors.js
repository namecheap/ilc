import extendError from '@namecheap/error-extender'

const errors = {};

errors.NavigationError = extendError('NavigationError');

export default Object.freeze(errors);
