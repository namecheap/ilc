import { JSONObject, parseJSON } from '../../common/services/json';
import preProcessResponse from '../../common/services/preProcessResponse';
import type { RouteWithSlotRow } from '../interfaces';

type RouteToRespond = {
    routeId: number;
    route?: string;
    next?: boolean;
    templateName: string | null;
    orderPos: number | null;
    domainId: number | null;
    versionId: string | number;
    namespace: string | null;
    meta: JSONObject | null;
    specialRole?: string;
};

type SlotToRespond = Pick<RouteWithSlotRow, 'appName' | 'props' | 'kind'>;

const prepareRouteToRespond = (appRoute: RouteToRespond) => {
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

type AppRouteWithSlots = ReturnType<typeof prepareRouteToRespond> & {
    slots: Record<string, SlotToRespond>;
};

const prepareRoutesWithSlotsToRespond = (appRoutes: RouteWithSlotRow[]): AppRouteWithSlots[] => {
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

export const prepareAppRouteToRespond = (appRoutes: RouteWithSlotRow[]): AppRouteWithSlots =>
    prepareRoutesWithSlotsToRespond(appRoutes)[0];

export const prepareAppRoutesToRespond = (v: RouteToRespond[]) => v.map((row) => prepareRouteToRespond(row));
