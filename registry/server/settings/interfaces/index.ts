import Joi from 'joi';

export enum SettingKeys {
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
    GlobalSpinnerEnabled = 'globalSpinner.enabled',
    GlobalSpinnerCustomHtml = 'globalSpinner.customHTML',
    I18nEnabled = 'i18n.enabled',
    I18nDefaultLocale = 'i18n.default.locale',
    I18nDefaultCurrency = 'i18n.default.currency',
    I18nSupportedLocales = 'i18n.supported.locale',
    I18nSupportedCurrencies = 'i18n.supported.currency',
}

export const enum TrailingSlashValues {
    DoNothing = 'doNothing',
    redirectToNonTrailingSlash = 'redirectToNonTrailingSlash',
    redirectToTrailingSlash = 'redirectToTrailingSlash',
}

export const enum Scope {
    Ilc = 'ilc',
    Registry = 'registry',
}

export const enum SettingTypes {
    Boolean = 'boolean',
    Url = 'url',
    String = 'string',
    StringArray = 'string[]',
    Enum = 'enum',
    Password = 'password',
}

type SettingValue = string | boolean | TrailingSlashValues | string[];

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
}

export const keySchema = Joi.string().min(1).max(50).valid(...Object.values(SettingKeys));

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
            is: Joi.valid(
                SettingKeys.AmdDefineCompatibilityMode,
                SettingKeys.AuthOpenIdEnabled,
                SettingKeys.GlobalSpinnerEnabled,
                SettingKeys.I18nEnabled
            ),
            then: Joi.boolean().strict().sensitive().required(),
        },
        {
            is: Joi.valid(
                SettingKeys.I18nSupportedCurrencies,
                SettingKeys.I18nSupportedLocales,
            ),
            then: Joi.array().items(Joi.string()),
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
