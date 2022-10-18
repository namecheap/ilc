import extendError from '@namecheap/error-extender';

import { ErrorCodes } from './ErrorCodes';
import { InternalError } from './InternalError';

export const FetchTemplateError = extendError('FetchTemplateError', {
    parent: InternalError,
    defaultData: {
        code: ErrorCodes.FETCH_TEMPLATE_ERROR,
    },
});
