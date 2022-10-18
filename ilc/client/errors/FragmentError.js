import extendError from '@namecheap/error-extender';

import { ErrorCodes } from './ErrorCodes';
import { InternalError } from './InternalError';

export const FragmentError = extendError('FragmentError', {
    parent: InternalError,
    defaultData: {
        code: ErrorCodes.FRAGMENT_ERROR,
    },
});
