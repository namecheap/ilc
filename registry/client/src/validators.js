import {
    required as createRequiredValidator,
    number as createNumberValidator,
} from 'react-admin';

export const required = createRequiredValidator();
export const number = createNumberValidator();
export const url = (value) => {
    if (value === undefined || value === null || value.length === 0) {
        return;
    }

    try {
        new URL(value);
        return;
    } catch (error) {
        return 'Should be a valid URL';
    }
};
