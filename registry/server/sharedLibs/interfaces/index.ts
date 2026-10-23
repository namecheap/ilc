import { z } from 'zod';
import { nullAsMissing, versionIdSchema } from '../../common/validation/schemas';

export interface SharedLibRow {
    name: string;
    spaBundle: string;
    assetsDiscoveryUrl: string | null;
    assetsDiscoveryUpdatedAt: number | null;
    adminNotes: string | null;
    l10nManifest: string | null;
}

export const sharedLibNameSchema = z.string().trim().min(1);

export const sharedLibParamsSchema = z.strictObject({
    name: sharedLibNameSchema,
});

export const sharedLibsListQuerySchema = z.object({
    range: z.string().optional(),
});

export const sharedLibsFiltersSchema = z.strictObject({
    name: z.string().optional(),
});

const urlSchema = z.string().trim().pipe(z.url());

const commonSharedLib = {
    spaBundle: nullAsMissing(urlSchema.optional()),
    assetsDiscoveryUrl: nullAsMissing(urlSchema.optional()),
    adminNotes: nullAsMissing(z.string().trim().min(1).optional()),
    l10nManifest: nullAsMissing(z.string().min(1).max(255).optional()),
    versionId: nullAsMissing(versionIdSchema),
};

/** Only the given fields change, the name comes from the URL */
export const partialSharedLibSchema = z
    .strictObject(commonSharedLib)
    .transform(({ versionId, ...sharedLib }) => sharedLib);

/** The SPA bundle comes from the assets discovery manifest when there is an assetsDiscoveryUrl */
export const sharedLibSchema = z
    .strictObject({
        ...commonSharedLib,
        name: nullAsMissing(sharedLibNameSchema),
    })
    .refine((sharedLib) => Boolean(sharedLib.assetsDiscoveryUrl) || sharedLib.spaBundle !== undefined, {
        path: ['spaBundle'],
        message: 'Invalid input: expected string, received undefined',
        // Reported along with other issues, as long as the two fields it reads are valid
        when: ({ issues }) =>
            !issues.some((issue) => ['spaBundle', 'assetsDiscoveryUrl'].includes(String(issue.path?.[0]))),
    })
    .transform(({ versionId, assetsDiscoveryUrl, ...sharedLib }) => ({
        ...sharedLib,
        assetsDiscoveryUrl: assetsDiscoveryUrl ?? null,
    }));

export type SharedLibInput = z.output<typeof sharedLibSchema>;
export type PartialSharedLibInput = z.output<typeof partialSharedLibSchema>;
export type SharedLibsFilters = z.output<typeof sharedLibsFiltersSchema>;
