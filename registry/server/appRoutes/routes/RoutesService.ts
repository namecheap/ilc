import { Knex } from 'knex';
import { User } from '../../../typings/User';
import db, { type VersionedKnex } from '../../db';
import { Tables } from '../../db/structure';
import { extractInsertedId, PG_UNIQUE_VIOLATION_CODE } from '../../util/db';
import { appendDigest } from '../../util/hmac';
import { EntityTypes, VersionedRecord } from '../../versioning/interfaces';
import { AppRoute, appRouteSchema, AppRouteSlot } from '../interfaces';
import { prepareAppRouteSlotsToSave, prepareAppRouteToSave } from '../services/prepareAppRoute';

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

    /**
     * @returns routeId
     */
    public async upsert(params: unknown, user: User, trxProvider: Knex.TransactionProvider): Promise<AppRoute> {
        const { slots, ...appRoute } = await appRouteSchema.validateAsync(params, {
            noDefaults: false,
            externals: false,
        });

        let savedAppRouteId;
        await this.db.versioning(user, { type: EntityTypes.routes, trxProvider }, async (trx) => {
            const result = await this.db(Tables.Routes)
                .insert(prepareAppRouteToSave(appRoute), 'id')
                .onConflict(this.db.raw('("orderPos", "domainIdIdxble", namespace) WHERE namespace IS NOT NULL'))
                .merge()
                .transacting(trx);
            savedAppRouteId = extractInsertedId(result as { id: number }[]);
            await this.db(Tables.RouteSlots).where('routeId', savedAppRouteId).delete().transacting(trx);
            await this.db
                .batchInsert(Tables.RouteSlots, prepareAppRouteSlotsToSave(slots, savedAppRouteId))
                .transacting(trx);
            return savedAppRouteId;
        });
        return { ...appRoute, id: savedAppRouteId };
    }

    public async deleteByNamespace(
        namespace: string,
        exclude: number[],
        { user, trxProvider }: { user: User; trxProvider: Knex.TransactionProvider },
    ) {
        const trx = await trxProvider?.();
        const routeIdsToDelete = await this.db(Tables.Routes)
            .select('id')
            .where({ namespace })
            .whereNotIn('id', exclude)
            .transacting(trx);

        await Promise.all(
            routeIdsToDelete.map(async (route) => {
                await this.db.versioning(user, { type: EntityTypes.routes, id: route.id, trxProvider }, async (trx) => {
                    await this.db(Tables.Routes).delete().where({ id: route.id }).transacting(trx);
                });
            }),
        );
    }

    public isOrderPosError(error: any) {
        const sqliteErrorOrderPos = 'UNIQUE constraint failed: routes.orderPos, routes.domainIdIdxble';
        const constraint = 'routes_orderpos_and_domainIdIdxble_unique';
        return (
            (error.code === PG_UNIQUE_VIOLATION_CODE && error.constraint === constraint) ||
            error?.message.includes(sqliteErrorOrderPos) ||
            error?.message.includes(constraint)
        );
    }
}

// TODO: implement factory and IoC Container
export const routesService = new RoutesService(db);
