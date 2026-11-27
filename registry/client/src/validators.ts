import { required as createRequiredValidator, number as createNumberValidator } from 'react-admin';

export const required = createRequiredValidator();
export const number = createNumberValidator();

export function url(value: unknown) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    try {
        new URL(String(value));
        return undefined;
    } catch {
        return 'Should be a valid URL';
    }
}

export function disallowedWhiteSpaces(value: unknown) {
    return typeof value === 'string' && value.includes(' ') ? 'Whitespaces are disallowed' : undefined;
}
