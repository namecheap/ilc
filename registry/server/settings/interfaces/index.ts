import Joi from 'joi';

export const enum SettingKeys {
    BaseUrl = 'baseUrl',
    TrailingSlash = 'trailingSlash',
    AuthOpenIdEnabled = 'auth.openid.enabled',
    AuthOpenIdDiscoveryUrl = 'auth.openid.discoveryUrl',
    AuthOpenIdClientId = 'auth.openid.clientId',
    AuthOpenIdClientSecret = 'auth.openid.clientSecret',
    AuthOpenIdResponseMode = 'auth.openid.responseMode',
    AuthOpenIdIdentifierClaimName = 'auth.openid.idClaimName',
    AuthOpenIdRequestedScopes = 'auth.openid.requestedScopes',
    AmdDefineCompatibilityMode = 'amdDefineCompatibilityMode',
};

export const enum TrailingSlashValues {
    DoNothing = 'doNothing',
    RedirectToBaseUrl = 'redirectToBaseUrl',
    RedirectToBaseUrlWithTrailingSlash = 'redirectToBaseUrlWithTrailingSlash',
};

export interface Setting {
    key: SettingKeys,
    value: string | TrailingSlashValues,
    secured: boolean,
};

export const keySchema = Joi.string().min(1).max(50).valid(
    SettingKeys.TrailingSlash,
    SettingKeys.BaseUrl,
    SettingKeys.AuthOpenIdResponseMode,
    SettingKeys.AuthOpenIdRequestedScopes,
    SettingKeys.AuthOpenIdIdentifierClaimName,
    SettingKeys.AuthOpenIdEnabled,
    SettingKeys.AuthOpenIdDiscoveryUrl,
    SettingKeys.AuthOpenIdClientSecret,
    SettingKeys.AuthOpenIdClientId,
    SettingKeys.AmdDefineCompatibilityMode
);

export const valueSchema = Joi.alternatives().conditional('key', {
    switch: [
        {
            is: Joi.valid(SettingKeys.TrailingSlash),
            then: Joi.string().valid(
                TrailingSlashValues.DoNothing,
                TrailingSlashValues.RedirectToBaseUrl,
                TrailingSlashValues.RedirectToBaseUrlWithTrailingSlash,
            ).required(),
        },
        {
            is: Joi.valid(SettingKeys.AmdDefineCompatibilityMode, SettingKeys.AuthOpenIdEnabled),
            then: Joi.boolean().strict().sensitive().required(),
        }
    ],
    otherwise: Joi.string().required(),
});

export const securedSchema = Joi.boolean();

const commonSettingSchema = {
    key: keySchema,
    value: valueSchema,
    secured: securedSchema,
};

export const partialSettingSchema = Joi.object({...commonSettingSchema});
