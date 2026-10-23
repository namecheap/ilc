import { isDomainValid } from '@hapi/address';
import { z } from 'zod';

import type { JSONObject } from '../../common/services/json';
import { jsonObjectSchema, versionIdSchema } from '../../common/validation/schemas';
import { templateNameSchema } from '../../templates/interfaces';

export interface RouterDomainsRow {
    id: number;
    domainName: string;
    template500: string;
    canonicalDomain: string | null;
    alias: string | null;
    props: JSONObject | null;
    ssrProps: JSONObject | null;
}

export const routerDomainIdSchema = z.coerce.number().int().positive();

export const routerDomainsParamsSchema = z.strictObject({
    id: routerDomainIdSchema,
});

export const routerDomainsListQuerySchema = z.object({
    range: z.string().optional(),
});

const localDomainPattern = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

// The check behind Joi's string().domain({ allowFullyQualified: true, tlds: false }), no tlds option means no TLD check
const domainSchema = z
    .string()
    .trim()
    .refine((domain) => localDomainPattern.test(domain) || isDomainValid(domain, { allowFullyQualified: true }), {
        message: 'Invalid domain name',
    });

/** How router domains are referred to by name, e.g. by the domainAlias of apps and routes */
export const domainAliasSchema = z
    .string()
    .trim()
    .toLowerCase()
    .max(64)
    .regex(/^[a-z0-9-]+$/);

/** PUT replaces the record as well, so omitted fields fall back to their defaults */
export const routerDomainsSchema = z
    .strictObject({
        domainName: domainSchema,
        template500: templateNameSchema,
        canonicalDomain: domainSchema.nullable().default(null),
        alias: domainAliasSchema.nullable().default(null),
        props: jsonObjectSchema.nullable().default(null),
        ssrProps: jsonObjectSchema.nullable().default(null),
        versionId: versionIdSchema,
    })
    .transform(({ versionId, ...routerDomain }) => routerDomain);

export type RouterDomainsInput = z.output<typeof routerDomainsSchema>;
