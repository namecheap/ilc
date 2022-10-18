import extendError from '@namecheap/error-extender';

import { ErrorCodes } from './ErrorCodes';
import { InternalError } from './InternalError';

export const CriticalInternalError = extendError('CriticalInternalError', {
    parent: InternalError,
    defaultData: {
        code: ErrorCodes.CRITICAL_INTERNAL_ERROR,
    },
});
