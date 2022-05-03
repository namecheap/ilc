import db from '../../db';

export const getRoutesById = (appRouteId: number) => {
    return db
        .select('routes.id as _routeId', 'routes.*', 'route_slots.*')
        .from('routes')
        .leftJoin('route_slots', 'route_slots.routeId', 'routes.id')
        .where('_routeId', appRouteId)
        .then(appRoutes => {
            // if there are no slots - then we will receive "id" and "routeId" as "null", due to result of "leftJoin".
            appRoutes.forEach(appRoute => {
                if (appRoute.routeId === null) {
                    appRoute.routeId = appRoute._routeId;
                }
                delete appRoute._routeId;
            })

            return appRoutes;
        });
}
