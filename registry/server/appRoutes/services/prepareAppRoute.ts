import _ from 'lodash/fp';

import preProcessResponse from '../../common/services/preProcessResponse';

const combineAppRoutesWithSlots = _.reduce((appRoutes: any, appRoute: any) => {
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

    const prevSavedAppRouteSlots = _.has(routeId, appRoutes) && appRoutes[routeId].slots;
    const nextAppRouteSlot = preProcessResponse({
        appName,
        props,
    });

    return {
        ...appRoutes,
        [routeId]: {
            id: routeId,
            route,
            next: Boolean(next),
            templateName,
            specialRole,
            slots: {
                ...prevSavedAppRouteSlots,
                [name]: nextAppRouteSlot,
            },
        },
    };
}, {});

export const prepareAppRoutesToRespond = _.compose(
    preProcessResponse,
    _.toArray,
    combineAppRoutesWithSlots,
);
