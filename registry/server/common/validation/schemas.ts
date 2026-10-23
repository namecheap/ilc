import { z } from 'zod';

/** A JSON object, what `Joi.object()` accepted. Arrays and other values are rejected. */
export const jsonObjectSchema = z.record(z.string(), z.json());

/** `versionId` is sent back by the Admin UI with every record, it is accepted and dropped. */
export const versionIdSchema = z.string().optional();

/**
 * Reads null as a missing value, like the Joi schemas defaulted with `.empty(null)` did,
 * so an optional field sent as null is left out instead of being set to NULL
 */
export function nullAsMissing<T extends z.ZodType>(schema: T) {
    return z.preprocess((value) => (value === null ? undefined : value), schema);
}
