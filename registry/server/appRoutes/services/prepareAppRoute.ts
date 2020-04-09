import _ from 'lodash/fp';

import preProcessResponse from '../../common/services/preProcessResponse';

const prepareRoutesWithSlotsToRespond = _.compose(
    _.toArray,
    _.reduce((appRoutes: any, appRoute: any) => {
        const {
            routeId,
            route,
            next,
            templateName,
            specialRole,
            name,
            appName,
            props,
            orderPos,
            kind,
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

        const nextAppRoute = {
            id: routeId,
            route,
            next: Boolean(next),
            specialRole,
            templateName,
            orderPos,
            slots
        };

        return {
            ...appRoutes,
            [routeId]: preProcessResponse(nextAppRoute)
        };
    }, {}),
);

export const prepareAppRouteToRespond = _.compose(
    _.first,
    prepareRoutesWithSlotsToRespond,
);

export const prepareAppRoutesToRespond = _.compose(
    prepareRoutesWithSlotsToRespond,
);
