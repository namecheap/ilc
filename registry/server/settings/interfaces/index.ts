import { z } from 'zod';
import { cspSchema } from './cspSchema';

export enum SettingKeys {
    BaseUrl = 'baseUrl',
    TrailingSlash = 'trailingSlash',
    AuthOpenIdEnabled = 'auth.openid.enabled',
    AuthOpenIdDiscoveryUrl = 'auth.openid.discoveryUrl',
    AuthOpenIdClientId = 'auth.openid.clientId',
    AuthOpenIdClientSecret = 'auth.openid.clientSecret',
    AuthOpenIdResponseMode = 'auth.openid.responseMode',
    AuthOpenIdIdentifierClaimName = 'auth.openid.idClaimName',
    AuthOpenIdUniqueIdentifierClaimName = 'auth.openid.uidClaimName',
    AuthOpenIdRequestedScopes = 'auth.openid.requestedScopes',
    AmdDefineCompatibilityMode = 'amdDefineCompatibilityMode',
    GlobalSpinnerEnabled = 'globalSpinner.enabled',
    GlobalSpinnerCustomHtml = 'globalSpinner.customHTML',
    I18nEnabled = 'i18n.enabled',
    I18nDefaultLocale = 'i18n.default.locale',
    I18nDefaultCurrency = 'i18n.default.currency',
    I18nSupportedLocales = 'i18n.supported.locale',
    I18nSupportedCurrencies = 'i18n.supported.currency',
    I18nRoutingStrategy = 'i18n.routingStrategy',
    OverrideConfigTrustedOrigins = 'overrideConfigTrustedOrigins',
    OnPropsUpdate = 'onPropsUpdate',
    CspConfig = 'cspConfig',
    CspTrustedLocalHosts = 'cspTrustedLocalHosts',
    CspEnableStrict = 'cspEnableStrict',
    FragmentProxyHeaders = 'fragmentProxyHeaders',
    TemplateProxyHeaders = 'templateProxyHeaders',
}

export const AllowedSettingKeysForDomains = [SettingKeys.CspConfig];

export const enum TrailingSlashValues {
    DoNothing = 'doNothing',
    redirectToNonTrailingSlash = 'redirectToNonTrailingSlash',
    redirectToTrailingSlash = 'redirectToTrailingSlash',
}

export enum RoutingStrategyValues {
    PrefixExceptDefault = 'prefix_except_default',
    Prefix = 'prefix',
    //TODO: add in future: "host"
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
    JSON = 'json',
    Integer = 'integer',
}

export enum OnPropsUpdateValues {
    Remount = 'remount',
    Update = 'update',
}

export type SettingValue = string | number | boolean | string[];

type SettingMeta = {
    type: SettingTypes;
    choices?: SettingValue[];
};

export type Setting = {
    key: SettingKeys;
    value: SettingValue;
    default: SettingValue;
    scope: Scope;
    secret: boolean;
    meta: SettingMeta;
};

/** value and default hold JSON-encoded text, '""' meaning unset */
export interface SettingRow {
    key: string;
    value: string | null;
    default: string | null;
    scope: string;
    secret: boolean;
    meta: SettingMeta | null;
}

export interface DomainSettingRow {
    id: number;
    domainId: number;
    key: string;
    value: string;
}

/** A settings row as the service reads it, the domain queries add the domain's value */
export type SettingRaw = SettingRow & {
    id?: number;
    domainId?: number;
    domainValue?: string;
};

export type SettingParsed = Omit<SettingRaw, 'value' | 'default' | 'meta'> & {
    value?: SettingValue;
    default?: SettingValue;
    meta: SettingMeta;
    protected?: boolean;
};

export const keySchema = z.enum(SettingKeys);

export const settingParamsSchema = z.strictObject({
    key: keySchema,
});

export const domainSettingParamsSchema = z.strictObject({
    id: z.coerce.number(),
});

export const settingQuerySchema = z.object({
    domainId: z.coerce.number().optional(),
});

export const settingsListQuerySchema = z.object({
    range: z.string().optional(),
});

/** Loose on purpose: unknown filters are ignored and values are coerced, as before */
export const settingsFiltersSchema = z.object({
    allowedForDomains: z
        .unknown()
        .optional()
        .transform((value) => (value ? Boolean(value) : null)),
    enforceDomain: z
        .unknown()
        .optional()
        .transform((value) => (value ? Number(value) : null)),
    domainName: z
        .unknown()
        .optional()
        .transform((value) => (value ? String(value) : null)),
});

const urlOrEmptySchema = z.union([z.literal(''), z.url({ protocol: /^https?$/ })]);

/** The CSP config is sent as a JSON string and stored as the object it parses to */
const cspConfigSchema = z
    .string()
    .optional()
    .transform((value, ctx) => {
        if (value === undefined || value === '') {
            return null;
        }
        try {
            return JSON.parse(value) as unknown;
        } catch {
            ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
            return z.NEVER;
        }
    })
    .pipe(cspSchema);

/** The value schema of each setting key */
function valueSchemaFor(key: SettingKeys): z.ZodType {
    switch (key) {
        case SettingKeys.TrailingSlash:
            return z.enum([
                TrailingSlashValues.DoNothing,
                TrailingSlashValues.redirectToNonTrailingSlash,
                TrailingSlashValues.redirectToTrailingSlash,
            ]);
        case SettingKeys.I18nRoutingStrategy:
            return z.enum(RoutingStrategyValues);
        case SettingKeys.AmdDefineCompatibilityMode:
        case SettingKeys.AuthOpenIdEnabled:
        case SettingKeys.GlobalSpinnerEnabled:
        case SettingKeys.I18nEnabled:
        case SettingKeys.CspEnableStrict:
            return z.boolean();
        case SettingKeys.I18nSupportedCurrencies:
        case SettingKeys.I18nSupportedLocales:
        case SettingKeys.CspTrustedLocalHosts:
            return z.array(z.string()).optional();
        case SettingKeys.FragmentProxyHeaders:
        case SettingKeys.TemplateProxyHeaders:
            return z.array(z.string()).nullish();
        case SettingKeys.BaseUrl:
        case SettingKeys.AuthOpenIdDiscoveryUrl:
            return urlOrEmptySchema.optional();
        case SettingKeys.OnPropsUpdate:
            return z.enum(OnPropsUpdateValues);
        case SettingKeys.CspConfig:
            return z.preprocess((value) => (value === null ? undefined : value), cspConfigSchema);
        default:
            return z.string().optional();
    }
}

/** Checks the value against the schema of the setting's key, issues are reported at "value" */
function withValueOfKey<T extends { key: SettingKeys; value?: unknown }>(setting: T, ctx: z.RefinementCtx) {
    const result = valueSchemaFor(setting.key).safeParse(setting.value);
    if (!result.success) {
        for (const issue of result.error.issues) {
            ctx.addIssue({ code: 'custom', message: issue.message, path: ['value', ...issue.path] });
        }
        return z.NEVER;
    }
    return { ...setting, value: result.data };
}

export const partialSettingSchema = z
    .strictObject({
        key: keySchema,
        value: z.unknown(),
        domainId: z.number().int().nullish(),
    })
    .transform(withValueOfKey);

export const createSettingSchema = z
    .strictObject({
        domainId: z.number().int(),
        key: keySchema,
        value: z.unknown(),
    })
    .transform(withValueOfKey);

export type UpdateSettingInput = z.output<typeof partialSettingSchema>;
export type CreateDomainSettingInput = z.output<typeof createSettingSchema>;
