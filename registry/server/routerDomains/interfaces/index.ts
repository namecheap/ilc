import Joi from 'joi';
import isValidDomain from 'is-valid-domain';

import { getJoiErr } from '../../util/helpers';
import { templateNameSchema } from '../../templates/routes/validation';

export default interface RouterDomains {
    id: number;
    domainName: string;
    template500?: string;
    props?: Record<string, any> | null;
    ssrProps?: Record<string, any> | null;
}

export const routerDomainIdSchema = Joi.string().trim().required();

const commonRouterDomainsSchema = {
    domainName: Joi.string()
        .trim()
        .min(1)
        .required()
        .external((value) => {
            if (value.match(/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/) || isValidDomain(value)) {
                return;
            }

            throw getJoiErr('domainName', 'Specified "domainName" is not valid.', value);
        }),
    template500: templateNameSchema.required(),
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
