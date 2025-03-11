import _ from 'lodash/fp';
import { Knex } from 'knex';
import db, { type VersionedKnex } from '../../db';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes, VersionedRecord, VersionRow } from '../../versioning/interfaces';
import { AppRoute, appRouteSchema, AppRouteSlot, AppRouteSlotDto, appRouteSlotSchema } from '../interfaces';
import { extractInsertedId } from '../../util/db';
import { prepareAppRouteToSave, prepareAppRouteSlotsToSave } from '../services/prepareAppRoute';
import { User } from '../../../typings/User';

type AppRouteDto = VersionedRecord<Omit<AppRoute, 'id'>> & AppRouteSlot;

export class RoutesService {
    constructor(private readonly db: VersionedKnex) {}

    public getRoutesById(appRouteId: number) {
        type QueryResult = AppRouteDto & {
            _routeId?: number;
        };
        const query = this.db
            .selectVersionedRows<QueryResult>(Tables.Routes, 'id', EntityTypes.routes, [
                'routes.id as _routeId',
                'routes.*',
                'route_slots.*',
            ])
            .from(Tables.Routes)
            .leftJoin('route_slots', 'route_slots.routeId', 'routes.id');
        return query.then((appRoutes) => {
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
            }, [] as AppRouteDto[]);
        });
    }

    public async upsert(params: unknown, user: User, trxProvider: Knex.TransactionProvider) {
        const { slots, ...appRoute } = await appRouteSchema.validateAsync(params, {
            noDefaults: true,
            externals: false,
        });

        await this.db.versioning(user, { type: EntityTypes.routes, trxProvider }, async (trx) => {
            const result = await this.db(Tables.Routes)
                .insert(prepareAppRouteToSave(appRoute), 'id')
                .onConflict(this.db.raw('(route, namespace) WHERE namespace IS NOT NULL'))
                .merge()
                .transacting(trx);
            const savedAppRouteId = extractInsertedId(result as { id: number }[]);
            await this.db(Tables.RouteSlots).where('routeId', savedAppRouteId).delete().transacting(trx);
            await this.db
                .batchInsert(Tables.RouteSlots, prepareAppRouteSlotsToSave(slots, savedAppRouteId))
                .transacting(trx);
            return extractInsertedId(result as { id: number }[]);
        });
    }
}

// TODO: implement factory and IoC Container
export const routesService = new RoutesService(db);
