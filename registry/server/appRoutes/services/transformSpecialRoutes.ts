export const SPECIAL_PREFIX = 'special:';
export const isSpecialRoute = (route: string) => route.startsWith(SPECIAL_PREFIX);
export const makeSpecialRoute = (specialRole: string) => `${SPECIAL_PREFIX}${specialRole}`;
const getSpecialRole = (route: string) => route.replace(SPECIAL_PREFIX, '');

export const transformSpecialRoutesForConsumer = (appRoutes: any) => {
    const handleRoute = (appRoute: Record<string, any>) => {
        if (!isSpecialRoute(appRoute.route)) {
            return appRoute;
        }

        const result = { ...appRoute };
        result.specialRole = getSpecialRole(appRoute.route);
        delete result.next;
        delete result.route;

        return result;
    };

    return Array.isArray(appRoutes) ? appRoutes.map(handleRoute) : handleRoute(appRoutes);
};

export const transformSpecialRoutesForDB = ({ specialRole, ...appRouteData }: Record<string, any>) => {
    if (!specialRole) {
        return appRouteData;
    }

    return {
        ...appRouteData,
        route: makeSpecialRoute(specialRole),
    };
};
