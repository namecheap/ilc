import { parseJSON, stringifyJSON } from '../../common/services/json';
import preProcessResponse from '../../common/services/preProcessResponse';
import { AppRouteSlot, AppRouteSlotDto } from '../interfaces';
import { AppRouteWithSlot } from '../routes/RoutesService';
import { ConsumerRoute } from './transformSpecialRoutes';

const prepareRouteToRespond = (appRoute: ConsumerRoute | AppRouteWithSlot): ConsumerRoute => {
    const base = {
        id: appRoute.routeId,
        route: appRoute.route,
        next: Boolean(appRoute.next),
        templateName: appRoute.templateName,
        orderPos: appRoute.orderPos,
        domainId: appRoute.domainId,
        versionId: appRoute.versionId,
        namespace: appRoute.namespace,
        ...('specialRole' in appRoute && appRoute.specialRole !== undefined
            ? { specialRole: appRoute.specialRole }
            : {}),
    };

    return Object.assign(preProcessResponse(base), {
        meta: appRoute.meta ? parseJSON(appRoute.meta) : {},
    });
};

type AppRouteWithSlots = ConsumerRoute & {
    slots: Record<string, AppRouteSlotDto>;
};

const prepareRoutesWithSlotsToRespond = (appRoutes: AppRouteWithSlot[]): AppRouteWithSlots[] => {
    const reduced = appRoutes.reduce<Record<number, AppRouteWithSlots>>((acc, appRoute) => {
        const { routeId, name, appName, props, kind } = appRoute;

        const prevSavedAppRouteSlots = (routeId in acc && acc[routeId].slots) || {};
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
            ...acc,
            [routeId]: {
                ...prepareRouteToRespond(appRoute),
                slots,
            },
        };
    }, {});

    return Object.values(reduced);
};

export const prepareAppRouteToSave = stringifyJSON(['meta']);

export const prepareAppRouteToRespond = (appRoutes: AppRouteWithSlot[]): AppRouteWithSlots =>
    prepareRoutesWithSlotsToRespond(appRoutes)[0];

export const prepareAppRoutesToRespond = (v: ConsumerRoute[]): ConsumerRoute[] =>
    v.map((row) => prepareRouteToRespond(row));

export function prepareAppRouteSlotsToSave(
    appRouteSlots: Record<string, AppRouteSlotDto>,
    routeId: number,
): Omit<AppRouteSlot, 'id'>[] {
    return Object.keys(appRouteSlots).map((appRouteSlotName) => {
        const slotData = appRouteSlots[appRouteSlotName];
        const withMetadata = {
            ...slotData,
            name: appRouteSlotName,
            routeId,
        };
        return stringifyJSON(['props'])(withMetadata);
    });
}
