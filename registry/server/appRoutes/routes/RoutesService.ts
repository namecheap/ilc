import { Knex } from 'knex';
import { User } from '../../../typings/User';
import db, { type VersionedKnex } from '../../db';
import { Tables } from '../../db/structure';
import { extractInsertedId, PG_UNIQUE_VIOLATION_CODE } from '../../util/db';
import { appendDigest } from '../../util/hmac';
import { EntityTypes, VersionedRecord } from '../../versioning/interfaces';
import { AppRoute, AppRouteDto, appRouteSchema, AppRouteSlot } from '../interfaces';
import { prepareAppRouteSlotsToSave, prepareAppRouteToSave } from '../services/prepareAppRoute';

export type AppRouteWithSlot = VersionedRecord<AppRoute & AppRouteSlot>;

export class RoutesService {
    constructor(private readonly db: VersionedKnex) {}

    public getRoutesById(appRouteId: number) {
        type QueryResult = AppRouteWithSlot & {
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
            }, [] as AppRouteWithSlot[]);
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

        let savedAppRouteId: number;
        const appRouteRecord = prepareAppRouteToSave(appRoute);
        const trx = await trxProvider();
        const appRouteRecordWithOrderPos =
            typeof appRouteRecord.orderPos === 'number'
                ? appRouteRecord
                : {
                      ...appRouteRecord,
                      orderPos:
                          (await this.findExistingOrderPos(appRoute, trx)) ??
                          (await this.getNextOrderPos(appRouteRecord.domainId, trx)),
                  };
        const existingRouteId = await this.findExistingRouteId(appRouteRecordWithOrderPos, trx);
        await this.db.versioning(user, { type: EntityTypes.routes, trxProvider, id: existingRouteId }, async (trx) => {
            const result = await this.db(Tables.Routes)
                .insert(appRouteRecordWithOrderPos, 'id')
                .onConflict(this.db.raw('("orderPos", "domainIdIdxble", namespace) WHERE namespace IS NOT NULL'))
                .merge()
                .transacting(trx);
            savedAppRouteId = extractInsertedId(result);
            await this.db(Tables.RouteSlots).where('routeId', savedAppRouteId).delete().transacting(trx);
            await this.db
                .batchInsert(Tables.RouteSlots, prepareAppRouteSlotsToSave(slots, savedAppRouteId))
                .transacting(trx);
            return savedAppRouteId;
        });
        return { ...appRoute, id: savedAppRouteId! };
    }

    public async deleteByNamespace(
        namespace: string,
        excludeIds: number[],
        { user, trxProvider }: { user: User; trxProvider: Knex.TransactionProvider },
    ) {
        const trx = await trxProvider?.();
        const routeIdsToDelete = await this.db(Tables.Routes)
            .select('id')
            .where({ namespace })
            .whereNotIn('id', excludeIds)
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

    public async getNextOrderPos(domainId: number | null, trx: Knex.Transaction) {
        const [{ max }] = await this.db(Tables.Routes)
            .max('orderPos')
            .where(function () {
                this.where({ domainId });
                this.whereNotNull('orderPos');
            })
            .transacting(trx);

        return max ? max + 10 : 10;
    }

    private async findExistingOrderPos(
        appRoute: Omit<AppRouteDto, 'slots'>,
        trx: Knex.Transaction,
    ): Promise<number | undefined | null> {
        const existingRoute = await this.db(Tables.Routes)
            .first('orderPos')
            .where({ route: appRoute.route, domainId: appRoute.domainId, namespace: appRoute.namespace })
            .transacting(trx);
        return existingRoute?.orderPos;
    }

    private async findExistingRouteId(
        appRoute: Omit<AppRouteDto, 'slots' | 'meta'>,
        trx: Knex.Transaction,
    ): Promise<number | undefined> {
        const existingRoute = await this.db(Tables.Routes)
            .first('id')
            .where({ orderPos: appRoute.orderPos, domainId: appRoute.domainId, namespace: appRoute.namespace })
            .transacting(trx);
        return existingRoute?.id;
    }
}

// TODO: implement factory and IoC Container
export const routesService = new RoutesService(db);
