import Joi from '@hapi/joi';


export const enum SettingKeys {
    BaseUrl = 'baseUrl',
    AuthOpenIdEnabled = 'auth.openid.enabled',
    AuthOpenIdDiscoveryUrl = 'auth.openid.discoveryUrl',
    AuthOpenIdClientId = 'auth.openid.clientId',
    AuthOpenIdClientSecret = 'auth.openid.clientSecret',
    AuthOpenIdResponseMode = 'auth.openid.responseMode',
    AuthOpenIdIdentifierClaimName = 'auth.openid.idClaimName',
    AuthOpenIdRequestedScopes = 'auth.openid.requestedScopes',
}

export interface Setting {
    key: SettingKeys,
    value: string,
}

const keySchema = Joi.string().min(1).max(50);

const commonSchema = {
    value: Joi.string().min(1),
};

export const partialTemplateSchema = Joi.object({
    ...commonSchema,
    key: keySchema.forbidden(),
});

export const templateSchema = Joi.object({
    ...commonSchema,
    key: keySchema.required(),
    value: commonSchema.value.required(),
});
