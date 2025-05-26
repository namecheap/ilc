import { Knex } from 'knex';
import { User } from '../../typings/User';
import { AppRoute, AppRouteDto } from '../appRoutes/interfaces';
import { routesService } from '../appRoutes/routes/RoutesService';
import { App } from '../apps/interfaces';
import { ApplicationEntry } from '../common/services/entries/ApplicationEntry';
import { EntryFactory } from '../common/services/entries/EntryFactory';
import { SharedLibEntry } from '../common/services/entries/SharedLibEntry';
import db, { VersionedKnex } from '../db';
import { SharedLib } from '../sharedLibs/interfaces';
import { isPostgres, PG_FOREIGN_KEY_VIOLATION_CODE } from '../util/db';
import { getJoiErr } from '../util/helpers';

type UpsertPayload = {
    apps?: App[];
    routes?: AppRouteDto[];
    sharedLibs?: SharedLib[];
};

type UpsertParams = {
    user: User;
    trxProvider: Knex.TransactionProvider;
    dryRun?: boolean;
};

export class ConfigService {
    constructor(private readonly db: VersionedKnex) {}

    async upsert(payload: UpsertPayload, { user, dryRun }: Omit<UpsertParams, 'trxProvider'>): Promise<void> {
        if (!payload.apps && !payload.routes && !payload.sharedLibs) {
            throw new Error('At least one of the following parameters should be provided: apps, routes, sharedLibs');
        }
        const appInstance = EntryFactory.getAppInstance();
        const sharedLibInstance = EntryFactory.getSharedLibInstance();

        if (!isPostgres(this.db)) {
            throw new Error('Upsert config is supported only if using PostgreSQL');
        }

        const trxProvider = this.db.transactionProvider();
        const trx = await trxProvider();

        try {
            const upsertedApps = await this.upsertApps(payload.apps ?? [], appInstance, {
                user,
                trxProvider,
                dryRun,
            });
            const upsertedRoutes = await this.upsertRoutes(payload.routes ?? [], { user, trxProvider });

            const groupedApps = this.groupByNamespace(upsertedApps, 'name');
            const groupedRoutes = this.groupByNamespace(upsertedRoutes, 'id');

            await this.upsertSharedLibs(payload.sharedLibs ?? [], sharedLibInstance, { user, trxProvider, dryRun });
            await this.deleteRoutesByNamespace(groupedRoutes, { user, trxProvider });
            await this.deleteAppsByNamespace(groupedApps, appInstance, { user, trxProvider });

            if (dryRun) {
                await trx.rollback();
            } else {
                await trx.commit();
            }
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    private async upsertApps(
        apps: App[],
        appInstance: ApplicationEntry,
        { user, trxProvider, dryRun }: UpsertParams,
    ): Promise<App[]> {
        return await Promise.all(apps.map((x) => appInstance.upsert(x, { user, trxProvider, fetchManifest: !dryRun })));
    }

    private async upsertRoutes(
        routes: AppRouteDto[],
        { user, trxProvider }: UpsertParams,
    ): Promise<(AppRoute & { id: number })[]> {
        this.validateRoutes(routes);
        const results: (AppRoute & { id: number })[] = [];
        for (const route of routes) {
            const result = await routesService.upsert(route, user, trxProvider);
            results.push(result);
        }
        return results;
    }

    private validateRoutes(routes: AppRouteDto[]) {
        const grouped = routes.reduce(
            (acc, route) => {
                const ns = route.namespace ?? '';
                if (!acc[ns]) {
                    acc[ns] = [];
                }
                acc[ns].push(route);
                return acc;
            },
            {} as Record<string, AppRouteDto[]>,
        );
        Object.values(grouped).forEach((namespaceRoutes) => {
            const duplicates = namespaceRoutes.filter(
                (route, idx, arr) =>
                    arr.findIndex((r) => r.route === route.route && r.domainId === route.domainId) !== idx,
            );
            const unorderedDuplicates = duplicates.filter((route) => typeof route.orderPos !== 'number');
            if (unorderedDuplicates.length > 0) {
                throw new Error(
                    `Multiple routes with the same "route" and "domainId" and without "orderPos" are present in the passed update:${JSON.stringify(unorderedDuplicates, null, 2)}To update, ensure that each of these routes has a unique "orderPos" value for the given "domainId".`,
                );
            }
        });
    }

    private async upsertSharedLibs(
        sharedLibs: SharedLib[],
        sharedLibInstance: SharedLibEntry,
        { user, trxProvider, dryRun }: UpsertParams,
    ): Promise<void> {
        await Promise.all(
            sharedLibs.map((x) => sharedLibInstance.upsert(x, { user, trxProvider, fetchManifest: !dryRun })),
        );
    }

    private async deleteRoutesByNamespace(
        upsertedRoutesByNamespace: Record<string, number[]>,
        { user, trxProvider }: UpsertParams,
    ): Promise<void> {
        await Promise.all(
            Object.keys(upsertedRoutesByNamespace).map(
                (namespace) =>
                    namespace &&
                    routesService.deleteByNamespace(namespace, upsertedRoutesByNamespace[namespace], {
                        user,
                        trxProvider,
                    }),
            ),
        );
    }

    private async deleteAppsByNamespace(
        upsertedAppsByNamespace: Record<string, string[]>,
        appInstance: ApplicationEntry,
        { user, trxProvider }: UpsertParams,
    ): Promise<void> {
        await Promise.all(
            Object.keys(upsertedAppsByNamespace).map(
                (namespace) =>
                    namespace &&
                    appInstance.deleteByNamespace(namespace, upsertedAppsByNamespace[namespace], {
                        user,
                        trxProvider,
                    }),
            ),
        );
    }

    public mapError(error: any): Error {
        if (routesService.isOrderPosError(error)) {
            return getJoiErr(
                'orderPos',
                'Specified "orderPos" value already exists for routes with provided "domainId" and "namespace"',
            );
        }
        if (error.code === PG_FOREIGN_KEY_VIOLATION_CODE && error.constraint === 'routes_domainid_foreign') {
            return getJoiErr('domainId', 'Specified "domainId" value does not exist');
        }
        if (error.code === PG_FOREIGN_KEY_VIOLATION_CODE && error.constraint === 'routes_templatename_foreign') {
            return getJoiErr('templateName', 'Specified "templateName" value does not exist');
        }
        if (error.code === PG_FOREIGN_KEY_VIOLATION_CODE && error.constraint === 'apps_enforcedomain_foreign') {
            return getJoiErr('enforceDomain', 'Specified "enforceDomain" domainId value does not exist');
        }

        return error;
    }

    private groupByNamespace<T extends { namespace?: string | null }, K extends keyof T>(
        items: T[],
        key: K,
    ): Record<string, T[K][]> {
        return items.reduce(
            (acc, item) => {
                if (item.namespace) {
                    acc[item.namespace] = acc[item.namespace] || [];
                    acc[item.namespace].push(item[key]);
                }
                return acc;
            },
            {} as Record<string, T[K][]>,
        );
    }
}

export const configService = new ConfigService(db);
