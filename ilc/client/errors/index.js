import extendError from '@namecheap/error-extender';

const errors = {};

errors.CorsError = extendError('CorsError');

export default Object.freeze(errors);
