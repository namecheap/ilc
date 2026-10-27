import { z } from 'zod';
import type { JSONObject } from '../../util/json';
import { jsonObjectSchema, versionIdSchema } from '../../common/validation/schemas';

export interface SharedPropsRow {
    name: string;
    props: JSONObject;
    ssrProps: JSONObject | null;
}

export const sharedPropsNameSchema = z.string().min(1).max(50);

export const sharedPropsParamsSchema = z.strictObject({
    name: sharedPropsNameSchema,
});

const commonSharedProps = {
    props: jsonObjectSchema.default({}),
    ssrProps: jsonObjectSchema.default({}),
    versionId: versionIdSchema,
};

export const partialSharedPropsSchema = z
    .strictObject(commonSharedProps)
    .transform(({ versionId, ...sharedProps }) => sharedProps);

export const sharedPropsSchema = z
    .strictObject({
        ...commonSharedProps,
        name: sharedPropsNameSchema,
        props: jsonObjectSchema,
    })
    .transform(({ versionId, ...sharedProps }) => sharedProps);

export type CreateSharedPropsInput = z.output<typeof sharedPropsSchema>;
export type UpdateSharedPropsInput = z.output<typeof partialSharedPropsSchema>;
