import Joi from 'joi';

import { templateNameSchema } from '../../templates/routes/validation';

export default interface RouterDomains {
    id: number;
    domainName: string;
    template500?: string;
    canonicalDomain?: string | null;
    props?: Record<string, any> | null;
    ssrProps?: Record<string, any> | null;
}

export const routerDomainIdSchema = Joi.string().trim().required();

const domainValidation = () =>
    Joi.alternatives().try(
        Joi.string()
            .trim()
            .pattern(/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/),
        Joi.string().trim().min(1).domain({ allowFullyQualified: true, tlds: false }),
    );

const commonRouterDomainsSchema = {
    domainName: domainValidation().required(),
    template500: templateNameSchema.required(),
    canonicalDomain: domainValidation().allow(null).default(null),
    props: Joi.object().allow(null).default(null),
    ssrProps: Joi.object().allow(null).default(null),
    versionId: Joi.string().strip(),
};

export const partialRouterDomainsSchema = Joi.object({
    ...commonRouterDomainsSchema,
});

export const routerDomainsSchema = Joi.object({
    ...commonRouterDomainsSchema,
});
