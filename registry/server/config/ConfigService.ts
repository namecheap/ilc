import { Knex } from 'knex';
import { App } from 'supertest/types';
import { User } from '../../typings/User';
import { routesService } from '../appRoutes/routes/RoutesService';
import { EntryFactory } from '../common/services/entries/EntryFactory';
import db, { VersionedKnex } from '../db';
import { SharedLib } from '../sharedLibs/interfaces';
import { isPostgres, PG_FOREIGN_KEY_VIOLATION_CODE } from '../util/db';
import { getJoiErr } from '../util/helpers';
import { AppRouteDto } from './transformConfig';
import { ApplicationEntry } from '../common/services/entries/ApplicationEntry';
import { SharedLibEntry } from '../common/services/entries/SharedLibEntry';

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
            const upsertedAppsByNamespace = await this.upsertApps(payload.apps, appInstance, {
                user,
                trxProvider,
                dryRun,
            });
            const upsertedRoutesByNamespace = await this.upsertRoutes(payload.routes, { user, trxProvider });

            await this.upsertSharedLibs(payload.sharedLibs, sharedLibInstance, { user, trxProvider, dryRun });
            await this.deleteRoutesByNamespace(upsertedRoutesByNamespace, { user, trxProvider });
            await this.deleteAppsByNamespace(upsertedAppsByNamespace, appInstance, { user, trxProvider });

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
        apps: App[] | undefined,
        appInstance: ApplicationEntry,
        { user, trxProvider, dryRun }: UpsertParams,
    ): Promise<Record<string, string[]>> {
        const upsertedApps = await Promise.all(
            apps?.map((x) => appInstance.upsert(x, { user, trxProvider, fetchManifest: !dryRun })) ?? [],
        );

        return upsertedApps.reduce(
            (acc, app) => {
                if (app.namespace) {
                    acc[app.namespace] = acc[app.namespace] || [];
                    acc[app.namespace].push(app.name);
                }
                return acc;
            },
            {} as Record<string, string[]>,
        );
    }

    private async upsertRoutes(
        routes: AppRouteDto[] | undefined,
        { user, trxProvider }: UpsertParams,
    ): Promise<Record<string, number[]>> {
        const upsertedRoutes = await Promise.all(routes?.map((x) => routesService.upsert(x, user, trxProvider)) ?? []);

        return upsertedRoutes.reduce(
            (acc, route) => {
                if (route.namespace) {
                    acc[route.namespace] = acc[route.namespace] || [];
                    acc[route.namespace].push(route.id!);
                }
                return acc;
            },
            {} as Record<string, number[]>,
        );
    }

    private async upsertSharedLibs(
        sharedLibs: SharedLib[] | undefined,
        sharedLibInstance: SharedLibEntry,
        { user, trxProvider, dryRun }: UpsertParams,
    ): Promise<void> {
        await Promise.all(
            sharedLibs?.map((x) => sharedLibInstance.upsert(x, { user, trxProvider, fetchManifest: !dryRun })) ?? [],
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

    mapError(error: any): Error {
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
}

export const configService = new ConfigService(db);
