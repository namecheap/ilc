import JoiDefault from 'joi';

import { appNameSchema } from '../../apps/interfaces';
import db from '../../db';
import { getJoiErr } from '../../util/helpers';
import { templateNameSchema } from '../../templates/routes/validation';
import { isPostgres } from '../../util/db';

const Joi = JoiDefault.defaults((schema) => {
    return schema.empty(null);
});

export interface AppRouteSlot {
    id?: number;
    routeId: number;
    name: string;
    appName: string;
    props?: string | null;
    kind?: string | null;
}

export interface AppRouteSlotDto {
    appName: string;
    props?: object;
    kind?: 'primary' | 'essential' | 'regular' | null;
}

const commonAppRouteSlot = {
    name: Joi.string().trim().min(1).max(255),
    appName: appNameSchema.external(async (value) => {
        const wrapperApp = await db('apps').first('kind').where({ name: value });
        if (!wrapperApp) {
            throw getJoiErr('appName', `Non-existing app name "${value}" specified.`, wrapperApp);
        } else if (wrapperApp.kind === 'wrapper') {
            throw getJoiErr('appName', "It's forbidden to use wrappers in routes.", wrapperApp);
        }

        return value;
    }),
    props: Joi.object().default({}),
    kind: Joi.string().valid('primary', 'essential', 'regular', null).default(null),
};

export const appRouteSlotSchema = Joi.object({
    ...commonAppRouteSlot,
    name: commonAppRouteSlot.name.forbidden(),
    appName: commonAppRouteSlot.appName.required(),
});

export const appRouteIdSchema = Joi.number().positive().integer().required();

export interface AppRoute {
    id?: number;
    orderPos?: number | null;
    route: string;
    next?: boolean;
    templateName?: string | null;
    meta?: object | string | null;
    domainId?: number | null;
    domainIdIdxble?: number | null;
    namespace?: string | null;
}

export type AppRouteDto = {
    specialRole?: string;
    orderPos?: number;
    route: string;
    next: boolean;
    templateName: string | null;
    slots: Record<string, AppRouteSlotDto>;
    domainId: number | null;
    meta: Record<string, any>;
    versionId: string;
    namespace: string | null;
};

const commonAppRoute = {
    specialRole: Joi.string().valid('404'),
    orderPos: Joi.number(),
    route: Joi.string().trim().max(255),
    next: Joi.bool().default(false),
    templateName: templateNameSchema.allow(null).default(null),
    slots: Joi.object().pattern(commonAppRouteSlot.name, appRouteSlotSchema),
    domainId: Joi.number().default(null),
    meta: Joi.object().default({}),
    versionId: Joi.string().strip(),
    namespace: Joi.string().default(null),
};

export const partialAppRouteSchema = Joi.object({
    ...commonAppRoute,
});

const conditionSpecialRole = {
    is: Joi.exist(),
    then: Joi.forbidden(),
    otherwise: Joi.required(),
};

export const appRouteSchema = Joi.object<AppRouteDto>({
    ...commonAppRoute,
    orderPos: commonAppRoute.orderPos.when('specialRole', {
        is: Joi.exist(),
        then: Joi.forbidden(),
        otherwise: Joi.optional(),
    }),
    route: commonAppRoute.route.when('specialRole', conditionSpecialRole),
    next: commonAppRoute.next.when('specialRole', {
        is: Joi.exist(),
        then: Joi.forbidden(),
    }),
});
