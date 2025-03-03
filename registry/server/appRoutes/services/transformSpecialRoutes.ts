import { AppRoute } from '../interfaces';

export const SPECIAL_PREFIX = 'special:';
export const isSpecialRoute = (route: string) => route.startsWith(SPECIAL_PREFIX);
export const makeSpecialRoute = (specialRole: string) => `${SPECIAL_PREFIX}${specialRole}`;
const getSpecialRole = (route: string) => route.replace(SPECIAL_PREFIX, '');

export type ConsumerRoute = Omit<AppRoute, 'route' | 'next'> & {
    next?: boolean;
    route?: string;
    specialRole?: string;
};

export function transformSpecialRoutesForConsumer(appRoutes: AppRoute): ConsumerRoute;
export function transformSpecialRoutesForConsumer(appRoutes: AppRoute[]): ConsumerRoute[];
export function transformSpecialRoutesForConsumer(appRoutes: AppRoute | AppRoute[]): ConsumerRoute | ConsumerRoute[] {
    const handleRoute = (appRoute: AppRoute) => {
        if (!isSpecialRoute(appRoute.route)) {
            return appRoute;
        }

        const { next, route, ...result } = appRoute;
        return {
            ...result,
            specialRole: getSpecialRole(appRoute.route),
        };
    };

    return Array.isArray(appRoutes) ? appRoutes.map(handleRoute) : handleRoute(appRoutes);
}

export function transformSpecialRoutesForDB({ specialRole, ...appRouteData }: ConsumerRoute): AppRoute {
    if (!specialRole) {
        return appRouteData as AppRoute;
    }

    return {
        ...appRouteData,
        orderPos: null,
        route: makeSpecialRoute(specialRole!),
    };
}
