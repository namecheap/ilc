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
        } = appRoute;

        const prevSavedAppRouteSlots = _.has(routeId, appRoutes) && appRoutes[routeId].slots || {};
        const nextAppRouteSlot = {
            appName,
            props,
        };
        const nextAppRoute = {
            id: routeId,
            route,
            next: Boolean(next),
            specialRole,
            templateName,
            slots: {
                ...prevSavedAppRouteSlots,
                [name]: preProcessResponse(nextAppRouteSlot),
            },
        };

        return {
            ...appRoutes,
            [routeId]: preProcessResponse(nextAppRoute)
        };
    }, {}),
);

const prepareRoutesAndSpecialRoutes = _.reduce((appRoutes: any, appRoute: any) => {
    if (appRoute.specialRole) {
        return {
            ...appRoutes,
            specialRoutes: [
                ...appRoutes.specialRoutes,
                appRoute,
            ]
        };
    } else {
        return {
            ...appRoutes,
            routes: [
                ...appRoutes.routes,
                appRoute
            ]
        };
    }
}, {routes: [], specialRoutes: []});

export const prepareAppRouteToRespond = _.compose(
    _.first,
    prepareRoutesWithSlotsToRespond,
);

export const prepareAppRoutesToRespond = _.compose(
    prepareRoutesAndSpecialRoutes,
    prepareRoutesWithSlotsToRespond,
);
