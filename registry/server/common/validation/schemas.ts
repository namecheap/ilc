import { z } from 'zod';

/** A JSON object, what `Joi.object()` accepted. Arrays and other values are rejected. */
export const jsonObjectSchema = z.record(z.string(), z.json());

/** `versionId` is sent back by the Admin UI with every record, it is accepted and dropped. */
export const versionIdSchema = z.string().min(1).optional();

/**
 * Reads null as a missing value, like the Joi schemas defaulted with `.empty(null)` did,
 * so an optional field sent as null is left out instead of being set to NULL
 */
export function nullAsMissing<T extends z.ZodType>(schema: T) {
    return z.preprocess((value) => (value === null ? undefined : value), schema);
}

const numberPattern = /^\s*[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e([+-]?\d+))?\s*$/i;

/** Accepts a number sent as a string, as Joi's number() did, e.g. "10" or " 1e3 " */
export function numeric<T extends z.ZodType>(schema: T) {
    return z.preprocess(
        (value) => (typeof value === 'string' && numberPattern.test(value) ? parseFloat(value.trim()) : value),
        schema,
    );
}

/** Accepts "true" and "false" in any case, as Joi's boolean() did */
export function booleanish<T extends z.ZodType>(schema: T) {
    return z.preprocess((value) => {
        if (typeof value !== 'string') {
            return value;
        }
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' ? true : normalized === 'false' ? false : value;
    }, schema);
}
