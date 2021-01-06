import _ from 'lodash/fp';

import preProcessResponse from '../../common/services/preProcessResponse';
import {stringifyJSON} from '../../common/services/json';

const prepareRouteToRespond = (appRoute: any) => {
    return Object.assign(preProcessResponse({
        id: appRoute.routeId,
        route: appRoute.route,
        next: Boolean(appRoute.next),
        specialRole: appRoute.specialRole,
        templateName: appRoute.templateName,
        orderPos: appRoute.orderPos,
    }), {
        meta: appRoute.meta ? JSON.parse(appRoute.meta) : {},
    });
};

const prepareRoutesWithSlotsToRespond = _.compose(
    _.toArray,
    _.reduce((appRoutes: any, appRoute: any) => {
        const {
            routeId,
            name,
            appName,
            props,
            kind,
            meta,
        } = appRoute;

        const prevSavedAppRouteSlots = _.has(routeId, appRoutes) && appRoutes[routeId].slots || {};
        const nextAppRouteSlot = {
            appName,
            props,
            kind,
        };

        const slots = { ...prevSavedAppRouteSlots };
        if (name) {
            slots[name] = preProcessResponse(nextAppRouteSlot);
        }

        return {
            ...appRoutes,
            [routeId]: {
                ...prepareRouteToRespond(appRoute),
                slots,
            }
        };
    }, {}),
);

export const prepareAppRouteToSave = stringifyJSON(['meta']);
export const prepareAppRouteToRespond = _.compose(
    _.first,
    prepareRoutesWithSlotsToRespond,
);

export const prepareAppRoutesToRespond = (v: any[]) => v.map(row => prepareRouteToRespond(row));
