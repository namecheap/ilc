import newrelic from 'newrelic';
import { setErrorData } from '../util/helpers';
import { getLogger } from '../util/logger';

type ErrorAttributes = { [key: string]: string | number | boolean };

export function noticeError(error: Error, customAttributes: ErrorAttributes = {}): void {
    newrelic.noticeError(error, { ...customAttributes });
    setErrorData(error, customAttributes);
    getLogger().error(error);
}

export default noticeError;
