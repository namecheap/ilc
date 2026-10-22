import { z } from 'zod';

/** A JSON object, what `Joi.object()` accepted. Arrays and other values are rejected. */
export const jsonObjectSchema = z.record(z.string(), z.json());

/** `versionId` is sent back by the Admin UI with every record, it is accepted and dropped. */
export const versionIdSchema = z.string().optional();
