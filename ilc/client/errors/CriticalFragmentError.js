import extendError from '@namecheap/error-extender';

import { ErrorCodes } from './ErrorCodes';
import { CriticalInternalError } from './CriticalInternalError';

export const CriticalFragmentError = extendError('CriticalFragmentError', {
    parent: CriticalInternalError,
    defaultData: {
        code: ErrorCodes.CRITICAL_FRAGMENT_ERROR,
    },
});
