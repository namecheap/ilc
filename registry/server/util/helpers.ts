import Joi, { ValidationError } from 'joi';
import _fp from 'lodash/fp';

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
                path,
                type: 'any.custom',
                input,
            },
        ],
        undefined,
    );
}

export const uniqueArray = (array: any[]) => [...new Set(array)];
