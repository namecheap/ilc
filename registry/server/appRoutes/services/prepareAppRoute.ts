import _ from 'lodash/fp';

import preProcessResponse from '../../common/services/preProcessResponse';
import { parseJSON, stringifyJSON } from '../../common/services/json';
import { AppRouteSlot, AppRouteSlotDto } from '../interfaces';

const prepareRouteToRespond = (appRoute: any) => {
    return Object.assign(
        preProcessResponse({
            id: appRoute.routeId,
            route: appRoute.route,
            next: Boolean(appRoute.next),
            specialRole: appRoute.specialRole,
            templateName: appRoute.templateName,
            orderPos: appRoute.orderPos,
            domainId: appRoute.domainId,
            versionId: appRoute.versionId,
            namespace: appRoute.namespace,
        }),
        {
            meta: appRoute.meta ? parseJSON(appRoute.meta) : {},
        },
    );
};

const prepareRoutesWithSlotsToRespond = _.compose(
    _.toArray,
    _.reduce((appRoutes: any, appRoute: any) => {
        const { routeId, name, appName, props, kind } = appRoute;

        const prevSavedAppRouteSlots = (_.has(routeId, appRoutes) && appRoutes[routeId].slots) || {};
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
            },
        };
    }, {}),
);

export const prepareAppRouteToSave = stringifyJSON(['meta']);
export const prepareAppRouteToRespond = _.compose(_.first, prepareRoutesWithSlotsToRespond);

export const prepareAppRoutesToRespond = (v: any[]) => v.map((row) => prepareRouteToRespond(row));

export function prepareAppRouteSlotsToSave(
    appRouteSlots: Record<string, AppRouteSlotDto>,
    routeId: number,
): AppRouteSlot[] {
    return _.compose(
        _.map((appRouteSlotName) =>
            _.compose(
                stringifyJSON(['props']),
                _.assign({
                    name: appRouteSlotName,
                    routeId,
                }),
                _.get(appRouteSlotName),
            )(appRouteSlots),
        ),
        _.keys,
    )(appRouteSlots);
}
