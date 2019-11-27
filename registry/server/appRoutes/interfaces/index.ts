import Joi from '@hapi/joi';

import {
    templateNameSchema,
} from '../../templates/interfaces';
import {
    appNameSchema,
} from '../../apps/interfaces';
export default interface AppRoute {
    id: number,
    specialRole: string,
    orderPos: number,
    route: string,
    next: boolean,
    templateName: string,
}

interface AppRouteSlotProps {
    [propName: string]: any,
}

export default interface AppRouteSlot {
    name: string,
    appName: string,
    props: AppRouteSlotProps
};

const commonAppRouteSlot = {
    name: Joi.string().trim().min(1).max(255),
    appName: appNameSchema,
    props: Joi.object().default({}),
};

export const partialAppRouteSlotSchema = Joi.object({
    ...commonAppRouteSlot,
    name: commonAppRouteSlot.name.forbidden(),
});

export const appRouteSlotSchema = Joi.object({
    ...commonAppRouteSlot,
    name: commonAppRouteSlot.name.forbidden(),
    appName: commonAppRouteSlot.appName.required(),
});

export const appRouteIdSchema = Joi.string().trim().required();

const commonAppRoute = {
    specialRole: Joi.string().trim(),
    orderPos: Joi.number(),
    route: Joi.string().trim().max(255),
    next: Joi.bool().default(false),
    templateName: templateNameSchema,
    slots: Joi.object().pattern(commonAppRouteSlot.name, appRouteSlotSchema),
};

export const partialAppRouteSchema = Joi.object({
    ...commonAppRoute,
});

export const appRouteSchema = Joi.object({
    ...commonAppRoute,
    orderPos: commonAppRoute.orderPos.required(),
    route: commonAppRoute.route.required(),
    slots: commonAppRoute.slots.required(),
});
