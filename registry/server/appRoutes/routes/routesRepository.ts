import db from '../../db';

export const getRoutesById = (appRouteId: number) => {
    return db
        .select('routes.id as _routeId', 'routes.*', 'route_slots.*')
        .from('routes')
        .leftJoin('route_slots', 'route_slots.routeId', 'routes.id')
        .then((appRoutes) => {
            return appRoutes.reduce((acc, appRoute) => {
                // "where" with alias doesn't work in MySql, and "having" without "groupBy" doesn't work in SQLite
                // thats why filtering better to do here
                if (appRoute._routeId === appRouteId) {
                    // if there are no slots - then we will receive "id" and "routeId" as "null", due to result of "leftJoin".
                    if (appRoute.routeId === null) {
                        appRoute.routeId = appRoute._routeId;
                    }
                    delete appRoute._routeId;

                    acc.push(appRoute);
                }

                return acc;
            }, []);
        });
};
