import extendError from '@namecheap/error-extender';

import { BaseError } from './BaseError';
import { ErrorCodes } from './ErrorCodes';

export const CorsError = extendError('CorsError', {
    parent: BaseError,
    code: ErrorCodes.CORS_ERROR,
});
