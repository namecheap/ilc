import { AppRouteDto } from '../interfaces';
import { AppRouteWithSlot } from '../routes/RoutesService';

export const SPECIAL_PREFIX = 'special:';
export const isSpecialRoute = (route: string) => route.startsWith(SPECIAL_PREFIX);
export const makeSpecialRoute = (specialRole: string) => `${SPECIAL_PREFIX}${specialRole}`;
const getSpecialRole = (route: string) => route.replace(SPECIAL_PREFIX, '');

export type ConsumerRoute = Omit<AppRouteWithSlot, 'route' | 'next'> & {
    next?: boolean;
    route?: string;
    specialRole?: string;
};

export function transformSpecialRoutesForConsumer(appRoutes: AppRouteWithSlot): ConsumerRoute;
export function transformSpecialRoutesForConsumer(appRoutes: AppRouteWithSlot[]): ConsumerRoute[];
export function transformSpecialRoutesForConsumer(
    appRoutes: AppRouteWithSlot | AppRouteWithSlot[],
): ConsumerRoute | ConsumerRoute[] {
    const handleRoute = (appRoute: AppRouteWithSlot) => {
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

export function transformSpecialRoutesForDB({ specialRole, ...appRouteData }: AppRouteDto): AppRouteDto {
    if (!specialRole) {
        return appRouteData;
    }

    return {
        ...appRouteData,
        orderPos: null,
        route: makeSpecialRoute(specialRole),
    };
}
