import Joi from 'joi';

export default interface RouterDomains {
    id: number,
    domainName: string,
};

export const routerDomainIdSchema = Joi.string().trim().required();

const routerDomainNameSchema = Joi.string().trim().min(1);

export const partialRouterDomainsSchema = Joi.object({
    domainName: routerDomainNameSchema,
});

export const routerDomainsSchema = Joi.object({
    domainName: routerDomainNameSchema.required(),
});
