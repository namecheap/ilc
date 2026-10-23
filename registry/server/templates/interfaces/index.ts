import { z } from 'zod';
import { numeric, versionIdSchema } from '../../common/validation/schemas';

export const templateNameSchema = z.string().min(1).max(50);

export interface TemplateRow {
    name: string;
    content: string | null;
}

export interface LocalizedTemplateRow {
    templateName: string;
    content: string;
    locale: string;
}

export interface LocalizedVersion {
    content: string;
}

export interface TemplateWithLocalizedVersions extends TemplateRow {
    localizedVersions: Record<string, LocalizedVersion>;
}

export const templateParamsSchema = z.strictObject({
    name: templateNameSchema,
});

export const localeNameSchema = z
    .string()
    .regex(/[a-z]{2}-[A-Z]{2,4}/)
    .min(5)
    .max(7);

export const localizedVersionParamsSchema = z.strictObject({
    name: templateNameSchema,
    locale: localeNameSchema,
});

const contentSchema = z.string().min(1);

export const localizedVersionSchema = z.strictObject({
    content: contentSchema,
});

const localizedVersionsSchema = z.record(localeNameSchema, localizedVersionSchema);

/** PUT: omitted localized versions are removed */
export const partialTemplateSchema = z
    .strictObject({
        content: contentSchema.optional(),
        versionId: versionIdSchema,
        localizedVersions: localizedVersionsSchema.optional(),
    })
    .transform(({ versionId, ...template }) => template);

export const templateSchema = z
    .strictObject({
        content: contentSchema,
        versionId: versionIdSchema,
        name: templateNameSchema,
        localizedVersions: localizedVersionsSchema.optional(),
    })
    .transform(({ versionId, ...template }) => template);

/** PATCH changes only the content */
export const templateContentSchema = z.strictObject({
    content: contentSchema,
});

export const templatesFiltersSchema = z.strictObject({
    domainId: z.union([numeric(z.number()), z.literal('null')]).optional(),
    id: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
    name: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
});

export const renderedTemplateQuerySchema = z.object({
    locale: z.string().optional(),
    domain: z.string().optional(),
});

export type CreateTemplateInput = z.output<typeof templateSchema>;
export type UpdateTemplateInput = z.output<typeof partialTemplateSchema>;
export type TemplatesFilters = z.output<typeof templatesFiltersSchema>;
