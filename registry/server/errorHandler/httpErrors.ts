import { extendError } from '../util/extendError';

export const HttpError = extendError('HttpError', { defaultData: {} });
export const NotFoundError = extendError('NotFoundError', {
    parent: HttpError,
    defaultData: {},
});
export const DBError = extendError('DBError', { defaultData: {} });
export const ForeignConstraintError = extendError('ForeignConstraintError', {
    defaultMessage: 'FOREIGN KEY constraint failed',
    parent: DBError,
    defaultData: {},
});
export const CustomError = extendError('CustomError', {
    defaultData: {},
});
