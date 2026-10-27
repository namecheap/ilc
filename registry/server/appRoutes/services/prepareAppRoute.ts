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

type SlotToRespond = Pick<RouteWithSlotRow, 'appName' | 'props' | 'kind'> & { keepAlive?: true };

/** One app stays an object, several apps become an ordered array (the rows arrive in slot order). */
export const packSlotEntries = <T>(entries: T[]): T | T[] => (entries.length === 1 ? entries[0] : entries);

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
    /** one app: object; several apps rendered in order: array */
    slots: Record<string, SlotToRespond | SlotToRespond[]>;
};

const prepareRoutesWithSlotsToRespond = (appRoutes: RouteWithSlotRow[]): AppRouteWithSlots[] => {
    type Draft = { route: ReturnType<typeof prepareRouteToRespond>; slots: Record<string, SlotToRespond[]> };

    const drafts = appRoutes.reduce<Record<number, Draft>>((acc, appRoute) => {
        const { routeId, name, appName, props, kind, keepAlive } = appRoute;
        const draft = acc[routeId] ?? { route: prepareRouteToRespond(appRoute), slots: {} };

        if (name) {
            const entry: SlotToRespond = {
                ...preProcessResponse({ appName, props, kind }),
                // additive: present only when set, so existing consumers see no new field by default
                ...(keepAlive ? { keepAlive: true } : {}),
            };
            draft.slots[name] = [...(draft.slots[name] ?? []), entry];
        }

        return { ...acc, [routeId]: draft };
    }, {});

    return Object.values(drafts).map(({ route, slots }) => ({
        ...route,
        slots: Object.fromEntries(Object.entries(slots).map(([name, entries]) => [name, packSlotEntries(entries)])),
    }));
};

export const prepareAppRouteToRespond = (appRoutes: RouteWithSlotRow[]): AppRouteWithSlots =>
    prepareRoutesWithSlotsToRespond(appRoutes)[0];

export const prepareAppRoutesToRespond = (v: RouteToRespond[]) => v.map((row) => prepareRouteToRespond(row));
