import extendError from '@namecheap/error-extender';

import { ErrorCodes } from './ErrorCodes';
import { InternalError } from './InternalError';

export const RuntimeError = extendError('RuntimeError', {
    parent: InternalError,
    defaultData: {
        code: ErrorCodes.RUNTIME_ERROR,
    },
});
