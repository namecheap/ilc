import db from '../../db';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac';

export const getRoutesById = (appRouteId: number) => {
    const versionIdSubQuery = db
        .table(tables.versioning)
        .max('id').as('versionId')
        .where('entity_id', db.raw('cast(routes.id as char)'))
        .andWhere('entity_type', 'routes');
    const query = db
        .select('routes.id as _routeId', 'routes.*', 'route_slots.*', versionIdSubQuery)
        .from('routes')
        .leftJoin('route_slots', 'route_slots.routeId', 'routes.id');
    return query
        .then((appRoutes) => {
            return appRoutes.reduce((acc, appRoute) => {
                appRoute.versionId = appendDigest(appRoute.versionId, 'route');
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
