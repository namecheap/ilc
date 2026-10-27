import { z } from 'zod';

import { domainAliasSchema } from '../../routerDomains/interfaces';

import type { JSONObject } from '../../util/json';
import { jsonObjectSchema, nullAsMissing, numeric, urlSchema, versionIdSchema } from '../../common/validation/schemas';

export const appKinds = ['primary', 'essential', 'regular', 'wrapper'] as const;

export interface AppRow {
    name: string;
    spaBundle: string | null;
    cssBundle: string | null;
    assetsDiscoveryUrl: string | null;
    assetsDiscoveryUpdatedAt: number | null;
    dependencies: JSONObject | null;
    props: JSONObject | null;
    ssrProps: JSONObject | null;
    /** A varchar column that holds a JSON array of shared props names */
    configSelector: string | null;
    ssr: { src: string; timeout: number } | null;
    kind: (typeof appKinds)[number] | null;
    wrappedWith: string | null;
    discoveryMetadata: JSONObject | null;
    adminNotes: string | null;
    enforceDomain: number | null;
    l10nManifest: string | null;
    namespace: string | null;
}

export const appNameSchema = z.string().trim().min(1);

export const appParamsSchema = z.strictObject({
    name: appNameSchema,
});

export const appsListQuerySchema = z.object({
    range: z.string().optional(),
});

export const appsFiltersSchema = z.strictObject({
    q: z.string().min(1).optional(),
    kind: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
    name: z.array(z.string().min(1)).optional(),
    id: z.array(z.string().min(1)).optional(),
    domainId: z.union([numeric(z.number()), z.literal('null')]).optional(),
});

function isEmptyObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0;
}

/**
 * A field with a default: null stands for the default, so an update can reset the field with null.
 * A missing field stays missing, the create schema fills in the default.
 */
function withDefault<T extends z.ZodType>(schema: T, defaultValue: z.output<T> | null) {
    return schema.nullish().transform((value) => (value === null ? defaultValue : value));
}

const commonApp = {
    spaBundle: nullAsMissing(urlSchema.optional()),
    cssBundle: nullAsMissing(urlSchema.optional()),
    assetsDiscoveryUrl: withDefault(urlSchema, null),
    dependencies: withDefault(jsonObjectSchema, {}),
    props: withDefault(jsonObjectSchema, {}),
    ssrProps: withDefault(jsonObjectSchema, {}),
    configSelector: withDefault(z.array(z.string().min(1)), []),
    // An empty object means no SSR, as null does
    ssr: z.preprocess(
        (value) => (isEmptyObject(value) ? null : value),
        withDefault(z.strictObject({ src: urlSchema, timeout: numeric(z.number()) }), null),
    ),
    kind: withDefault(z.enum(appKinds), 'regular'),
    wrappedWith: withDefault(z.string().trim().min(1), null),
    discoveryMetadata: withDefault(jsonObjectSchema, {}),
    adminNotes: nullAsMissing(z.string().trim().min(1).optional()),
    enforceDomain: withDefault(numeric(z.number()), null),
    domainAlias: nullAsMissing(domainAliasSchema.optional()),
    l10nManifest: nullAsMissing(z.string().min(1).max(255).optional()),
    versionId: nullAsMissing(versionIdSchema),
    namespace: withDefault(z.string().min(1), null),
};

const exclusiveDomainReference = [
    ({ enforceDomain, domainAlias }: { enforceDomain?: number | null; domainAlias?: string }) =>
        enforceDomain == null || domainAlias === undefined,
    { message: 'contains a conflict between optional exclusive peers [enforceDomain, domainAlias]' },
] as const;

/** PUT and PATCH change only the given fields, the name comes from the URL */
export const partialAppSchema = z
    .strictObject(commonApp)
    .refine(...exclusiveDomainReference)
    .transform(({ versionId, ...app }) => ({
        ...app,
        // Wrappers can't be wrapped
        wrappedWith: app.kind === 'wrapper' && app.wrappedWith !== undefined ? null : app.wrappedWith,
    }));

export const appSchema = z
    .strictObject({
        ...commonApp,
        name: nullAsMissing(appNameSchema),
    })
    .refine(...exclusiveDomainReference)
    .transform(({ versionId, ...app }) => {
        const kind = app.kind ?? 'regular';
        return {
            ...app,
            kind,
            assetsDiscoveryUrl: app.assetsDiscoveryUrl ?? null,
            dependencies: app.dependencies ?? {},
            props: app.props ?? {},
            ssrProps: app.ssrProps ?? {},
            configSelector: app.configSelector ?? [],
            ssr: app.ssr ?? null,
            wrappedWith: kind === 'wrapper' ? null : (app.wrappedWith ?? null),
            discoveryMetadata: app.discoveryMetadata ?? {},
            enforceDomain: app.enforceDomain ?? null,
            namespace: app.namespace ?? null,
        };
    });

export type AppInput = z.output<typeof appSchema>;
export type PartialAppInput = z.output<typeof partialAppSchema>;
export type AppsFilters = z.output<typeof appsFiltersSchema>;
