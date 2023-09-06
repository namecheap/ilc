import newrelic from 'newrelic';
import extendError from '@namecheap/error-extender';
import { getLogger } from '../util/logger';

function noticeError(error: Error, errorInfo = {}): void {
    const additionalInfo = Object.assign({}, errorInfo);
    newrelic.noticeError(error, additionalInfo);

    const ExtendedError = extendError(error.name);
    getLogger().error(new ExtendedError({ cause: error, data: additionalInfo, message: error.message }));
}

export default noticeError;
