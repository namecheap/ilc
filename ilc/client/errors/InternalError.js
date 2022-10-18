import extendError from '@namecheap/error-extender';

import { BaseError } from './BaseError';
import { ErrorCodes } from './ErrorCodes';

export const InternalError = extendError('InternalError', {
    parent: BaseError,
    defaultData: {
        code: ErrorCodes.INTERNAL_ERROR,
    }
});
