import { Knex } from 'knex';
import { User } from '../../typings/User';
import { appRouteSchema, type RouteRow } from '../appRoutes/interfaces';
import type { RoutesService } from '../appRoutes/services/RoutesService';
import { App } from '../apps/interfaces';
import { ApplicationEntry } from '../common/services/entries/ApplicationEntry';
import { EntryFactory } from '../common/services/entries/EntryFactory';
import { VersionedKnex } from '../db';
import { UnprocessableContent } from '../errorHandler/httpErrors';
import { sharedLibSchema } from '../sharedLibs/interfaces';
import type { SharedLibsService } from '../sharedLibs/services/SharedLibsService';
import { PG_FOREIGN_KEY_VIOLATION_CODE } from '../util/db';
import { getJoiErr } from '../util/helpers';
import { z } from 'zod';

type UpsertPayload = {
    apps?: App[];
    // Validated before upserting
    routes?: unknown[];
    // Validated one by one while upserting
    sharedLibs?: unknown[];
};

type UpsertParams = {
    user: User;
    trxProvider: Knex.TransactionProvider;
    dryRun?: boolean;
};

export class ConfigService {
    constructor(
        private readonly db: VersionedKnex,
        private readonly sharedLibs: SharedLibsService,
        private readonly routes: RoutesService,
    ) {}

    async upsert(payload: UpsertPayload, { user, dryRun }: Omit<UpsertParams, 'trxProvider'>): Promise<void> {
        if (!payload.apps && !payload.routes && !payload.sharedLibs) {
            throw new Error('At least one of the following parameters should be provided: apps, routes, sharedLibs');
        }
        const appInstance = EntryFactory.getAppInstance();

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

            await this.upsertSharedLibs(payload.sharedLibs ?? [], { user, trxProvider, dryRun });
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

    private async upsertRoutes(routes: unknown[], { user, trxProvider }: UpsertParams): Promise<RouteRow[]> {
        this.validateRoutes(routes);
        const parsedRoutes = await Promise.all(routes.map((route) => parse(appRouteSchema, route)));
        const results: RouteRow[] = [];
        for (const route of parsedRoutes) {
            const result = await this.routes.upsert(route, user, trxProvider);
            results.push(result);
        }
        return results;
    }

    /** Runs on the routes as sent, so the error shows them that way */
    private validateRoutes(routes: unknown[]) {
        const grouped = routes.reduce<Record<string, unknown[]>>((acc, route) => {
            const ns = String(field(route, 'namespace') ?? '');
            if (!acc[ns]) {
                acc[ns] = [];
            }
            acc[ns].push(route);
            return acc;
        }, {});
        Object.values(grouped).forEach((namespaceRoutes) => {
            const duplicates = namespaceRoutes.filter(
                (route, idx, arr) =>
                    arr.findIndex(
                        (r) =>
                            field(r, 'route') === field(route, 'route') &&
                            field(r, 'domainId') === field(route, 'domainId') &&
                            field(r, 'domainAlias') === field(route, 'domainAlias'),
                    ) !== idx,
            );
            const unorderedDuplicates = duplicates.filter((route) => typeof field(route, 'orderPos') !== 'number');
            if (unorderedDuplicates.length > 0) {
                throw new Error(
                    `Multiple routes with the same "route" and "domainId" and without "orderPos" are present in the passed update:${JSON.stringify(unorderedDuplicates, null, 2)}To update, ensure that each of these routes has a unique "orderPos" value for the given "domainId".`,
                );
            }
        });
    }

    private async upsertSharedLibs(sharedLibs: unknown[], { user, trxProvider, dryRun }: UpsertParams): Promise<void> {
        await Promise.all(
            sharedLibs.map(async (x) => {
                const sharedLib = await parse(sharedLibSchema, x);
                await this.sharedLibs.upsert(sharedLib, { user, trxProvider, fetchManifest: !dryRun });
            }),
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
                    this.routes.deleteByNamespace(namespace, upsertedRoutesByNamespace[namespace], {
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
        if (this.routes.isOrderPosError(error)) {
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

async function parse<T extends z.ZodType>(schema: T, value: unknown): Promise<z.output<T>> {
    const result = await schema.safeParseAsync(value);
    if (!result.success) {
        throw new UnprocessableContent({ message: z.prettifyError(result.error) });
    }
    return result.data;
}

function field(value: unknown, key: string): unknown {
    return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}
