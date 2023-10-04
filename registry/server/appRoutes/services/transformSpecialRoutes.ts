import { AppRoute, AppRouteDto } from '../interfaces';

export const SPECIAL_PREFIX = 'special:';
export const isSpecialRoute = (route: string) => route.startsWith(SPECIAL_PREFIX);
export const makeSpecialRoute = (specialRole: string) => `${SPECIAL_PREFIX}${specialRole}`;
const getSpecialRole = (route: string) => route.replace(SPECIAL_PREFIX, '');

export function transformSpecialRoutesForConsumer(appRoutes: AppRoute): AppRouteDto;
export function transformSpecialRoutesForConsumer(appRoutes: AppRoute[]): AppRouteDto[];
export function transformSpecialRoutesForConsumer(appRoutes: AppRoute | AppRoute[]): AppRouteDto | AppRouteDto[] {
    const handleRoute = (appRoute: AppRoute) => {
        if (!isSpecialRoute(appRoute.route)) {
            return appRoute;
        }

        const { next, route, ...result } = appRoute;
        result.specialRole = getSpecialRole(appRoute.route);
        return result;
    };

    return Array.isArray(appRoutes) ? appRoutes.map(handleRoute) : handleRoute(appRoutes);
}

export function transformSpecialRoutesForDB({ specialRole, ...appRouteData }: AppRoute): AppRoute {
    if (!specialRole) {
        return appRouteData;
    }

    return {
        ...appRouteData,
        route: makeSpecialRoute(specialRole),
    };
}
