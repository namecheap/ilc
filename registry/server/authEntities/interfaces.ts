import Joi from 'joi';
import type { JSONValue } from '../common/services/json';

export enum AuthProviders {
    Local = 'local',
    Bearer = 'bearer',
    OpenID = 'openid',
}
const AuthProvidersVals = Object.values(AuthProviders);

export enum AuthRoles {
    admin = 'admin',
    readonly = 'readonly',
}
const AuthRolesVals = Object.values(AuthRoles);

export interface AuthEntity {
    id: number | null;
    identifier: string;
    secret?: string | null;
    provider: AuthProviders;
    role: AuthRoles;
}

export default AuthEntity; // TODO remove

export interface AuthEntityRow {
    id: number;
    identifier: string;
    secret: string | null;
    // varchar columns without a check constraint, the allowed values are enforced by validation only
    provider: string | null;
    role: string | null;
    meta: JSONValue | null;
}

const commonSchema = {
    identifier: Joi.string().min(1).max(255),
    secret: Joi.string(),
    provider: Joi.string().valid(...AuthProvidersVals),
    role: Joi.string().valid(...AuthRolesVals),
    versionId: Joi.string().strip(),
};

export const updateSchema = Joi.object({
    ...commonSchema,
    id: Joi.number().forbidden(),
    identifier: commonSchema.identifier.forbidden(),
    provider: commonSchema.provider.forbidden(),
});

export const createSchema = Joi.object({
    ...commonSchema,
    identifier: commonSchema.identifier.required(),
    provider: commonSchema.provider.required(),
    role: commonSchema.role.required(),
});
