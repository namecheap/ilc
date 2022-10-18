import extendError from '@namecheap/error-extender'
import { ErrorCodes } from './ErrorCodes';
import { CriticalInternalError } from './CriticalInternalError';

export const NavigationError = extendError('NavigationError', {
    parent: CriticalInternalError,
    defaultData: {
        code: ErrorCodes.NAVIGATION_ERROR, 
    },
});
