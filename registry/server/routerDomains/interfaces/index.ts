import Joi from 'joi';
import { templateNameSchema } from '../../templates/interfaces';

export default interface RouterDomains {
    id: number,
    domainName: string,
    template500?: string,
};

export const routerDomainIdSchema = Joi.string().trim().required();

const commonRouterDomainsSchema = {
    domainName: Joi.string().trim().min(1),
    template500: templateNameSchema.allow(null),
};

export const partialRouterDomainsSchema = Joi.object({
    ...commonRouterDomainsSchema,
});

export const routerDomainsSchema = Joi.object({
    ...commonRouterDomainsSchema,
    domainName: commonRouterDomainsSchema.domainName.required(),
});
