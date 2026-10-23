import { Knex } from 'knex';

import type { PaginatedResult } from '../../../typings/PaginatedResult';
import { User } from '../../../typings/User';
import { CustomError, NotFoundError, UnprocessableContent } from '../../errorHandler/httpErrors';
import type { RouterDomainsService } from '../../routerDomains/services/RouterDomainsService';
import { handleForeignConstraintError, isUniqueConstraintError } from '../../util/db';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type {
    AppRouteSlotInput,
    AppRoutesFilters,
    CreateAppRouteInput,
    RouteRow,
    RouteWithSlotRow,
    UpdateAppRouteInput,
} from '../interfaces';
import type {
    RouteInsert,
    RouteListRow,
    RoutesRepository,
    RouteSlotInsert,
    RouteUpdate,
} from '../repositories/RoutesRepository';
import { makeSpecialRoute } from './transformSpecialRoutes';

export class RoutesService {
    constructor(
        private readonly repository: RoutesRepository,
        private readonly routerDomains: RouterDomainsService,
        private readonly versioning: Versioning,
    ) {}

    list(filters: AppRoutesFilters, range: string | undefined): Promise<PaginatedResult<RouteListRow>> {
        return this.repository.list(filters, range);
    }

    public async getRoutesById(appRouteId: number): Promise<RouteWithSlotRow[]> {
        const appRoutes = await this.repository.findWithSlotsById(appRouteId);
        return appRoutes.map((appRoute) => ({ ...appRoute, versionId: appendDigest(appRoute.versionId, 'route') }));
    }

    /**
     * @returns routeId
     */
    async create(appRoute: CreateAppRouteInput, user: User | undefined): Promise<number> {
        await this.assertSlotApps(appRoute.slots);
        const domainId = await this.resolveDomainId(appRoute);

        if (appRoute.specialRole && (await this.repository.specialRouteExists(appRoute.specialRole, domainId))) {
            throw new UnprocessableContent({
                message: `"specialRole" "${appRoute.specialRole}" for provided "domainId" already exists`,
            });
        }

        const record = toCreateRecord(appRoute, domainId);

        try {
            const saved = await this.versioning.withVersion(user, { type: EntityTypes.routes }, async (trx) => {
                const orderPos =
                    record.orderPos === undefined
                        ? await this.repository.getNextOrderPos(domainId, trx)
                        : record.orderPos;
                const savedRoute = await this.repository.insert({ ...record, orderPos }, trx);
                await this.repository.replaceSlots(savedRoute.id, toSlotRecords(appRoute.slots, savedRoute.id), trx);
                return savedRoute;
            });
            return saved.id;
        } catch (error) {
            if (this.isOrderPosError(error)) {
                throw new UnprocessableContent({
                    message: `Specified "orderPos" value already exists for routes with provided "domainId"`,
                });
            }
            handleForeignConstraintError(error);
            throw error;
        }
    }

    async update(appRouteId: number, appRoute: UpdateAppRouteInput, user: User | undefined): Promise<void> {
        await this.assertSlotApps(appRoute.slots);
        const domainId = await this.resolveDomainId(appRoute);
        const record = toUpdateRecord(appRoute, domainId);

        await this.versioning.withVersion(user, { type: EntityTypes.routes, id: appRouteId }, async (trx) => {
            const count = await this.repository.update(appRouteId, record, trx);
            if (!count) {
                throw new NotFoundError();
            }
            await this.repository.replaceSlots(appRouteId, toSlotRecords(appRoute.slots, appRouteId), trx);
        });
    }

    async delete(appRouteId: number, user: User | undefined): Promise<void> {
        if ((await this.repository.findDefault404Id()) === appRouteId) {
            throw new CustomError({ message: "Default 404 error can't be deleted" });
        }

        await this.versioning.withVersion(user, { type: EntityTypes.routes, id: appRouteId }, async (trx) => {
            const count = await this.repository.delete(appRouteId, trx);
            if (!count) {
                throw new NotFoundError();
            }
        });
    }

    /** Creates or replaces the route inside the caller's transaction, for config upserts */
    public async upsert(
        appRoute: CreateAppRouteInput,
        user: User,
        trxProvider: Knex.TransactionProvider,
    ): Promise<RouteRow> {
        if (appRoute.specialRole) {
            // The special role used to reach the database as a column and fail there
            throw new UnprocessableContent({ message: 'Special routes can not be upserted with the config' });
        }

        const domainId = await this.resolveDomainId(appRoute);
        const record = toCreateRecord(appRoute, domainId);
        const trx = await trxProvider();

        const orderPos =
            typeof record.orderPos === 'number'
                ? record.orderPos
                : ((await this.repository.findOrderPos(
                      { route: record.route, domainId, namespace: record.namespace },
                      trx,
                  )) ?? (await this.repository.getNextOrderPos(domainId, trx)));
        const recordWithOrderPos = { ...record, orderPos };

        const existingRouteId = await this.repository.findIdByOrderPos(
            { orderPos, domainId, namespace: record.namespace },
            trx,
        );

        return this.versioning.withVersion(
            user,
            { type: EntityTypes.routes, trxProvider, id: existingRouteId },
            async (trx) => {
                const savedRoute = await this.repository.upsert(recordWithOrderPos, trx);
                await this.repository.replaceSlots(savedRoute.id, toSlotRecords(appRoute.slots, savedRoute.id), trx);
                return savedRoute;
            },
        );
    }

    public async deleteByNamespace(
        namespace: string,
        excludeIds: number[],
        { user, trxProvider }: { user: User; trxProvider: Knex.TransactionProvider },
    ) {
        const routeIdsToDelete = await this.repository.findIdsByNamespace(namespace, excludeIds, await trxProvider());

        await Promise.all(
            routeIdsToDelete.map(async (id) => {
                await this.versioning.withVersion(user, { type: EntityTypes.routes, id, trxProvider }, (trx) =>
                    this.repository.delete(id, trx),
                );
            }),
        );
    }

    public isOrderPosError(error: unknown) {
        return isUniqueConstraintError(error, 'routes_orderpos_and_domainIdIdxble_unique');
    }

    /** Slot apps must exist and must not be wrappers */
    private async assertSlotApps(slots: Record<string, AppRouteSlotInput>): Promise<void> {
        const appNames = Object.values(slots).map((slot) => slot.appName);
        if (!appNames.length) {
            return;
        }

        const appKinds = await this.repository.findAppKinds(appNames);
        for (const appName of appNames) {
            if (!appKinds.has(appName)) {
                throw new UnprocessableContent({ message: `Non-existing app name "${appName}" specified.` });
            }
            if (appKinds.get(appName) === 'wrapper') {
                throw new UnprocessableContent({ message: "It's forbidden to use wrappers in routes." });
            }
        }
    }

    private async resolveDomainId({ domainId, domainAlias }: { domainId?: number; domainAlias?: string }) {
        return domainAlias ? this.routerDomains.getIdByAlias(domainAlias) : (domainId ?? null);
    }
}

type RouteFields = Pick<
    CreateAppRouteInput,
    'specialRole' | 'orderPos' | 'next' | 'templateName' | 'meta' | 'namespace'
>;

/** A special route is stored as "special:<role>" without an order position */
function toRouteFields(
    { specialRole, orderPos, next, templateName, meta, namespace }: RouteFields,
    domainId: number | null,
) {
    const common = { next, templateName, meta, namespace, domainId };
    return specialRole ? { ...common, orderPos: null, route: makeSpecialRoute(specialRole) } : { ...common, orderPos };
}

function toCreateRecord(
    appRoute: CreateAppRouteInput,
    domainId: number | null,
): Omit<RouteInsert, 'orderPos'> & { orderPos: number | null | undefined } {
    const fields = toRouteFields(appRoute, domainId);
    const route = 'route' in fields ? fields.route : appRoute.route;
    if (route === undefined) {
        // The schema requires a route unless there is a special role
        throw new Error('Route has neither a route nor a special role');
    }
    return { ...fields, route };
}

function toUpdateRecord(appRoute: UpdateAppRouteInput, domainId: number | null): RouteUpdate {
    const fields = toRouteFields(appRoute, domainId);
    return 'route' in fields ? fields : { ...fields, route: appRoute.route };
}

function toSlotRecords(slots: Record<string, AppRouteSlotInput>, routeId: number): RouteSlotInsert[] {
    return Object.entries(slots).map(([name, slot]) => ({ ...slot, name, routeId }));
}
