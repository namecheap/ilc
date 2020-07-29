import Joi from '@hapi/joi';

export enum AuthProviders {
    Local = 'local',
    Bearer = 'bearer',
    OpenID = 'openid',
}
const AuthProvidersVals = Object.values(AuthProviders);

export enum AuthRoles {
    admin = 'admin',
    user = 'user',
}
const AuthRolesVals = Object.values(AuthRoles);

export default interface AuthEntity {
    id: number|null,
    identifier: string,
    secret: string|null,
    provider: AuthProviders,
    role: AuthRoles
};

const commonSchema = {
    identifier: Joi.string().min(1).max(255),
    secret: Joi.string(),
    provider: Joi.string().valid(...AuthProvidersVals),
    role: Joi.string().valid(...AuthRolesVals),
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
