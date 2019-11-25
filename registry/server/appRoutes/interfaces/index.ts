import Joi from '@hapi/joi';

import {
    templateNameSchema,
} from '../../templates/interfaces';

export default interface AppRoute {
    id: number,
    specialRole: string,
    orderPos: number,
    route: string,
    next: boolean,
    templateName: string,
}

export const appRouteIdSchema = Joi.string().trim().required();

const commonAppRoute = {
    specialRole: Joi.string().trim(),
    orderPos: Joi.number(),
    route: Joi.string().trim().max(255),
    next: Joi.bool().default(false),
    templateName: templateNameSchema,
};

export const partialAppRouteSchema = Joi.object({
    ...commonAppRoute,
});

export const appRouteSchema = Joi.object({
    ...commonAppRoute,
    orderPos: commonAppRoute.orderPos.required(),
    route: commonAppRoute.route.required(),
});
