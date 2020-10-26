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
    redirectToNonTrailingSlash = 'redirectToNonTrailingSlash',
    redirectToTrailingSlash = 'redirectToTrailingSlash',
};

export const enum Scope {
    Ilc = 'ilc',
    Registry = 'registry',
};

export const enum SettingTypes {
    Boolean = 'boolean',
    Url = 'url',
    String = 'string',
    Enum = 'enum',
    Password = 'password',
};

type SettingValue = string | boolean | TrailingSlashValues;

export interface Setting {
    key: SettingKeys,
    value: SettingValue,
    default: SettingValue,
    scope: Scope,
    secret: boolean,
    meta: {
        type: SettingTypes,
        choices?: any[],
    },
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

const valueSchema = Joi.alternatives().conditional('key', {
    switch: [
        {
            is: Joi.valid(SettingKeys.TrailingSlash),
            then: Joi.string().valid(
                TrailingSlashValues.DoNothing,
                TrailingSlashValues.redirectToNonTrailingSlash,
                TrailingSlashValues.redirectToTrailingSlash,
            ).required(),
        },
        {
            is: Joi.valid(SettingKeys.AmdDefineCompatibilityMode, SettingKeys.AuthOpenIdEnabled),
            then: Joi.boolean().strict().sensitive().required(),
        },
        {
            is: Joi.valid(SettingKeys.BaseUrl, SettingKeys.AuthOpenIdDiscoveryUrl),
            then: Joi.string().uri({
                scheme: [/https?/],
                allowRelative: false,
            }).empty(''),
        }
    ],
    otherwise: Joi.string().empty(''),
});

export const partialSettingSchema = Joi.object({
    key: keySchema.required(),
    value: valueSchema,
});
