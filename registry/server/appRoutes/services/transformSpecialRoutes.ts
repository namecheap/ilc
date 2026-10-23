export const SPECIAL_PREFIX = 'special:';

export const isSpecialRoute = (route: string) => route.startsWith(SPECIAL_PREFIX);

export const makeSpecialRoute = (specialRole: string) => `${SPECIAL_PREFIX}${specialRole}`;

const getSpecialRole = (route: string) => route.replace(SPECIAL_PREFIX, '');

/** What API consumers get: a special route has its special role instead of a route and next */
export type ConsumerRoute<T> = Omit<T, 'route' | 'next'> & {
    next?: boolean;
    route?: string;
    specialRole?: string;
};

type RouteWithPath = { route?: string; next?: boolean };

function toConsumerRoute<T extends RouteWithPath>(appRoute: T): ConsumerRoute<T> {
    const { next, route, ...rest } = appRoute;
    if (!route || !isSpecialRoute(route)) {
        return { ...rest, route, next };
    }

    return { ...rest, specialRole: getSpecialRole(route) };
}

export function transformSpecialRoutesForConsumer<T extends RouteWithPath>(appRoutes: T): ConsumerRoute<T>;
export function transformSpecialRoutesForConsumer<T extends RouteWithPath>(appRoutes: T[]): ConsumerRoute<T>[];
export function transformSpecialRoutesForConsumer<T extends RouteWithPath>(
    appRoutes: T | T[],
): ConsumerRoute<T> | ConsumerRoute<T>[] {
    return Array.isArray(appRoutes) ? appRoutes.map(toConsumerRoute) : toConsumerRoute(appRoutes);
}
