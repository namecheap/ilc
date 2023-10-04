import extendError from '@namecheap/error-extender';

export const HttpError = extendError('HttpError');
export const NotFoundError = extendError('NotFoundError', {
    parent: HttpError,
});
export const DBError = extendError('DBError');
export const ForeignConstraintError = extendError('ForeignConstraintError', {
    defaultMessage: 'FOREIGN KEY constraint failed',
    parent: DBError,
});
export const CustomError = extendError('CustomError');
