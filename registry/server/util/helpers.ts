import Joi, { ValidationError } from 'joi';
import _fp from 'lodash/fp';

export const joiErrorToResponse = _fp.compose<
    Array<Joi.ValidationError>,
    Array<Joi.ValidationErrorItem>,
    Array<string | undefined>,
    string
>(_fp.join('\n'), _fp.map(_fp.get('message')), _fp.get('details'));

export function getJoiErr(path: string, message: string) {
    return new ValidationError(
        'ValidationError',
        [
            {
                message: message,
                path: path,
                type: 'any.custom',
            },
        ],
        undefined,
    );
}

export const uniqueArray = (array: any[]) => [...new Set(array)];
