import { extendError } from '../util/extendError';

const HttpError = extendError('HttpError', { defaultData: {} });

export const UnprocessableContent = extendError('UnprocessableContent', {
    parent: HttpError,
    defaultData: {},
});
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
