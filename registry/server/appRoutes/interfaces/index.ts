import { z } from 'zod';

import { domainAliasSchema } from '../../routerDomains/interfaces';

import type { JSONObject } from '../../common/services/json';
import { booleanish, jsonObjectSchema, nullAsMissing, numeric, versionIdSchema } from '../../common/validation/schemas';
import { templateNameSchema } from '../../templates/interfaces';
import type { VersionedRecord } from '../../versioning/interfaces';

export interface RouteRow {
    id: number;
    orderPos: number | null;
    route: string;
    next: boolean;
    templateName: string | null;
    meta: JSONObject | null;
    domainId: number | null;
    domainIdIdxble: number | null;
    namespace: string | null;
}

export interface RouteSlotRow {
    id: number;
    routeId: number;
    name: string;
    appName: string;
    props: JSONObject | null;
    kind: string | null;
    /** order of the app among the apps of one slot */
    position: number;
    /** the app stays mounted (hidden) when a route no longer lists it in this slot */
    keepAlive: boolean;
}

/** A route left-joined with its slots, one row per slot: the slot columns are null when the route has no slots */
export type RouteWithSlotRow = VersionedRecord<
    RouteRow & { routeId: number } & {
        [K in 'name' | 'appName' | 'props' | 'kind' | 'position' | 'keepAlive']: RouteSlotRow[K] | null;
    }
>;

const slotKinds = ['primary', 'essential', 'regular'] as const;

export const appRouteSlotSchema = z.strictObject({
    appName: nullAsMissing(z.string().trim().min(1)),
    props: nullAsMissing(jsonObjectSchema.default({})),
    kind: z
        .enum(slotKinds)
        .nullish()
        .transform((kind) => kind ?? null),
    keepAlive: nullAsMissing(booleanish(z.boolean()).default(false)),
});

export type AppRouteSlotInput = z.output<typeof appRouteSlotSchema>;

/** Several apps in one slot, rendered in this order; an app may be listed only once per slot */
const appRouteSlotListSchema = z
    .array(appRouteSlotSchema)
    .min(1)
    .superRefine((entries, ctx) => {
        const seen = new Set<string>();
        for (const entry of entries) {
            if (seen.has(entry.appName)) {
                ctx.addIssue({ code: 'custom', message: 'An app can be listed only once in one slot' });
                return;
            }
            seen.add(entry.appName);
        }
    });

/**
 * A slot holds one app (the object every route used so far) or an ordered list of apps.
 * The two forms are validated separately so the object form keeps its error messages.
 */
const appRouteSlotValueSchema = z.unknown().transform((value, ctx): AppRouteSlotInput | AppRouteSlotInput[] => {
    const result = Array.isArray(value) ? appRouteSlotListSchema.safeParse(value) : appRouteSlotSchema.safeParse(value);
    if (!result.success) {
        for (const issue of result.error.issues) {
            // re-issued under the slot's path, so the object form keeps its messages
            ctx.addIssue({ code: 'custom', message: issue.message, path: [...issue.path] });
        }
        return z.NEVER;
    }
    return result.data;
});

export const slotEntries = (slot: AppRouteSlotInput | AppRouteSlotInput[]): AppRouteSlotInput[] =>
    Array.isArray(slot) ? slot : [slot];

export const appRouteIdSchema = z.coerce.number().int().positive();

export const appRouteParamsSchema = z.strictObject({
    id: appRouteIdSchema,
});

export const appRoutesListQuerySchema = z.object({
    range: z.string().optional(),
});

/** Unknown filter keys are ignored, as before */
export const appRoutesFiltersSchema = z.object({
    showSpecial: z.boolean().optional(),
    routePrefix: z.string().optional(),
    domainId: z.union([numeric(z.number()), z.literal('null')]).optional(),
});

const commonAppRoute = {
    specialRole: nullAsMissing(z.enum(['404']).optional()),
    orderPos: nullAsMissing(numeric(z.number()).optional()),
    route: nullAsMissing(z.string().trim().min(1).max(255).optional()),
    next: nullAsMissing(booleanish(z.boolean()).optional()),
    templateName: templateNameSchema.nullish().transform((templateName) => templateName ?? null),
    slots: nullAsMissing(z.record(z.string().min(1).max(255), appRouteSlotValueSchema).default({})),
    domainId: nullAsMissing(numeric(z.number()).optional()),
    domainAlias: nullAsMissing(domainAliasSchema.optional()),
    meta: nullAsMissing(jsonObjectSchema.default({})),
    versionId: nullAsMissing(versionIdSchema),
    namespace: nullAsMissing(z.string().min(1).optional()).transform((namespace) => namespace ?? null),
};

type DomainReference = { domainId?: number; domainAlias?: string };

const exclusiveDomainReference = [
    ({ domainId, domainAlias }: DomainReference) => domainId === undefined || domainAlias === undefined,
    { message: 'contains a conflict between optional exclusive peers [domainId, domainAlias]' },
] as const;

/** PUT replaces the route */
export const partialAppRouteSchema = z
    .strictObject(commonAppRoute)
    .refine(...exclusiveDomainReference)
    .transform(({ versionId, next, ...appRoute }) => ({ ...appRoute, next: next ?? false }));

/** A special route (404) has no route, orderPos and next of its own, those come from the special role */
export const appRouteSchema = z
    .strictObject(commonAppRoute)
    .refine(...exclusiveDomainReference)
    .superRefine((appRoute, ctx) => {
        if (appRoute.specialRole === undefined) {
            if (appRoute.route === undefined) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['route'],
                    message: 'Invalid input: expected string, received undefined',
                });
            }
            return;
        }

        for (const field of ['orderPos', 'route', 'next'] as const) {
            if (appRoute[field] !== undefined) {
                ctx.addIssue({ code: 'custom', path: [field], message: 'Not allowed together with "specialRole"' });
            }
        }
    })
    .transform(({ versionId, next, ...appRoute }) => ({
        ...appRoute,
        next: appRoute.specialRole === undefined ? (next ?? false) : undefined,
    }));

export type AppRouteSlotsInput = Record<string, AppRouteSlotInput | AppRouteSlotInput[]>;
export type CreateAppRouteInput = z.output<typeof appRouteSchema>;
export type UpdateAppRouteInput = z.output<typeof partialAppRouteSchema>;
export type AppRoutesFilters = z.output<typeof appRoutesFiltersSchema>;
