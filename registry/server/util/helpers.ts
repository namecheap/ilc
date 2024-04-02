import Joi, { ValidationError } from 'joi';
import _fp from 'lodash/fp';
import { type ExtendedError } from '@namecheap/error-extender';

export const joiErrorToResponse = _fp.compose<
    Array<Joi.ValidationError>,
    Array<Joi.ValidationErrorItem>,
    Array<string | undefined>,
    string
>(_fp.join('\n'), _fp.map(_fp.get('message')), _fp.get('details'));

export function getJoiErr(path: string, message: string, input?: any) {
    return new ValidationError(
        'ValidationError',
        [
            {
                message,
                path: [path],
                type: 'any.custom',
            },
        ],
        undefined,
    );
}

export const uniqueArray = (array: any[]) => [...new Set(array)];

export function defined<T>(value: T | null | undefined): T {
    if (value === undefined || value === null) {
        throw new Error(`Expected value to be defined, but received ${value}`);
    }
    return value;
}

export function setErrorData(error: Error, data: Record<string, string | number | boolean>): void {
    if ('data' in error && typeof error.data === 'object' && error.data !== null) {
        Object.assign(error.data, data);
    } else {
        Object.defineProperty(error, 'data', { enumerable: true, writable: false, value: data });
    }
}
