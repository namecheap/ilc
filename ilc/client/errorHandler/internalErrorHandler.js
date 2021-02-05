import uuidv4 from 'uuid/v4';

import noticeError from './noticeError';
import crashIlc from './crashIlc';

export default function internalErrorHandler(error, errorInfo = {}) {
    const errorId = uuidv4();

    noticeError(error, {
        ...errorInfo,
        type: 'INTERNAL_ERROR',
        errorId,
    });

    crashIlc(errorId);
}
