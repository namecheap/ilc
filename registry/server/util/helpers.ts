import {ValidationError} from 'joi';

export function getJoiErr(path: string, message: string) {
    return new ValidationError('ValidationError', [{
        message: message,
        path: path,
        type: 'any.custom',
    }], undefined);
}
