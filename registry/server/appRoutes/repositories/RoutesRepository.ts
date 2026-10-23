import type { Knex } from 'knex';

import type { PaginatedResult } from '../../../typings/PaginatedResult';
import { Tables } from '../../db/structure';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { AppRoutesFilters, RouteRow, RouteSlotRow, RouteWithSlotRow } from '../interfaces';
import { makeSpecialRoute, SPECIAL_PREFIX } from '../services/transformSpecialRoutes';

export type RouteInsert = Omit<RouteRow, 'id' | 'domainIdIdxble' | 'next'> & { next?: boolean };
export type RouteUpdate = Partial<RouteInsert>;
export type RouteSlotInsert = Omit<RouteSlotRow, 'id'>;
export type RouteListRow = VersionedRecord<RouteRow & { routeId: number }>;

/** The columns of RouteWithSlotRow, the slot's are named so they don't overwrite the route's id */
export const routeWithSlotColumns = [
    `${Tables.Routes}.*`,
    `${Tables.Routes}.id as routeId`,
    `${Tables.RouteSlots}.name`,
    `${Tables.RouteSlots}.appName`,
    `${Tables.RouteSlots}.props`,
    `${Tables.RouteSlots}.kind`,
];

export class RoutesRepository {
    constructor(
        private readonly db: Knex,
        private readonly versioning: Versioning,
    ) {}

    async list(filters: AppRoutesFilters, range: string | undefined): Promise<PaginatedResult<RouteListRow>> {
        const query = this.versioning
            .versionedSelect<
                typeof Tables.Routes,
                RouteListRow
            >(Tables.Routes, 'id', EntityTypes.routes, ['routes.id as routeId', 'routes.*'])
            .orderBy('orderPos', 'ASC')
            .orderBy('routes.id', 'ASC');

        if (filters.showSpecial === true) {
            query.where('routes.route', 'like', `${SPECIAL_PREFIX}%`);
        } else {
            query.whereNot('routes.route', 'like', `${SPECIAL_PREFIX}%`);

            if (filters.routePrefix !== undefined) {
                query.where('routes.route', 'like', `${filters.routePrefix}%`);
            }
        }

        if (filters.domainId !== undefined) {
            query.where('domainId', filters.domainId === 'null' ? null : filters.domainId);
        }

        return query.range(range);
    }

    /** One row per slot, a route without slots gives one row with null slot columns */
    async findWithSlotsById(routeId: number): Promise<RouteWithSlotRow[]> {
        return this.versioning
            .versionedSelect<
                typeof Tables.Routes,
                RouteWithSlotRow
            >(Tables.Routes, 'id', EntityTypes.routes, routeWithSlotColumns)
            .leftJoin(Tables.RouteSlots, `${Tables.RouteSlots}.routeId`, `${Tables.Routes}.id`)
            .where('routes.id', routeId);
    }

    async specialRouteExists(specialRole: string, domainId: number | null): Promise<boolean> {
        const existing = await this.db(Tables.Routes)
            .where({ route: makeSpecialRoute(specialRole), domainId })
            .first('id');
        return existing !== undefined;
    }

    async findDefault404Id(): Promise<number | undefined> {
        const route = await this.db(Tables.Routes)
            .where({ route: makeSpecialRoute('404'), domainId: null })
            .first('id');
        return route?.id;
    }

    async findAppKinds(appNames: string[]): Promise<Map<string, string | null>> {
        const apps = await this.db(Tables.Apps).whereIn('name', appNames).select('name', 'kind');
        return new Map(apps.map((app) => [app.name, app.kind]));
    }

    async getNextOrderPos(domainId: number | null, trx: Knex.Transaction): Promise<number> {
        const [{ max }] = await trx(Tables.Routes)
            .max<{ max: number | null }[]>('orderPos')
            .where({ domainId })
            .whereNotNull('orderPos');

        return max ? max + 10 : 10;
    }

    async findOrderPos(
        lookup: { route: string; domainId: number | null; namespace: string | null },
        trx: Knex.Transaction,
    ): Promise<number | null | undefined> {
        const existingRoute = await trx(Tables.Routes).where(lookup).first('orderPos');
        return existingRoute?.orderPos;
    }

    async findIdByOrderPos(
        lookup: { orderPos: number | null; domainId: number | null; namespace: string | null },
        trx: Knex.Transaction,
    ): Promise<number | undefined> {
        const existingRoute = await trx(Tables.Routes).where(lookup).first('id');
        return existingRoute?.id;
    }

    async findIdsByNamespace(namespace: string, excludeIds: number[], trx: Knex.Transaction): Promise<number[]> {
        const routes = await trx(Tables.Routes).where({ namespace }).whereNotIn('id', excludeIds).select('id');
        return routes.map((route) => route.id);
    }

    async insert(route: RouteInsert, trx: Knex.Transaction): Promise<RouteRow> {
        const [row] = await trx(Tables.Routes).insert(route).returning('*');
        return row;
    }

    /** Insert, or replace the route of the namespace with the same orderPos and domain */
    async upsert(route: RouteInsert, trx: Knex.Transaction): Promise<RouteRow> {
        const [row] = await trx(Tables.Routes)
            .insert(route)
            .onConflict(this.db.raw('("orderPos", "domainIdIdxble", namespace) WHERE namespace IS NOT NULL'))
            .merge()
            .returning('*');
        return row;
    }

    async update(routeId: number, route: RouteUpdate, trx: Knex.Transaction): Promise<number> {
        return trx(Tables.Routes).where('id', routeId).update(route);
    }

    async replaceSlots(routeId: number, slots: RouteSlotInsert[], trx: Knex.Transaction): Promise<void> {
        await trx(Tables.RouteSlots).where('routeId', routeId).delete();
        await this.db.batchInsert(Tables.RouteSlots, slots).transacting(trx);
    }

    async delete(routeId: number, trx: Knex.Transaction): Promise<number> {
        return trx(Tables.Routes).where('id', routeId).delete();
    }
}
