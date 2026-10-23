import { z } from 'zod';
import type { JSONValue } from '../common/services/json';
import { versionIdSchema } from '../common/validation/schemas';

export enum AuthProviders {
    Local = 'local',
    Bearer = 'bearer',
    OpenID = 'openid',
}

export enum AuthRoles {
    admin = 'admin',
    readonly = 'readonly',
}

export interface AuthEntityRow {
    id: number;
    identifier: string;
    secret: string | null;
    // varchar columns without a check constraint, the allowed values are enforced by validation only
    provider: string | null;
    role: string | null;
    meta: JSONValue | null;
}

export const authEntityParamsSchema = z.strictObject({
    id: z.coerce.number(),
});

/** The identifier and the provider can't be changed */
export const updateSchema = z
    .strictObject({
        secret: z.string().min(1).optional(),
        role: z.enum(AuthRoles).optional(),
        versionId: versionIdSchema,
    })
    .transform(({ versionId, ...authEntity }) => authEntity);

export const createSchema = z
    .strictObject({
        identifier: z.string().min(1).max(255),
        secret: z.string().min(1).optional(),
        provider: z.enum(AuthProviders),
        role: z.enum(AuthRoles),
        versionId: versionIdSchema,
    })
    .transform(({ versionId, ...authEntity }) => authEntity);

export type CreateAuthEntityInput = z.output<typeof createSchema>;
export type UpdateAuthEntityInput = z.output<typeof updateSchema>;
