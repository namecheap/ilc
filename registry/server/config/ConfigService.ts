import { Knex } from 'knex';
import { User } from '../../typings/User';
import { appRouteSchema, type RouteRow } from '../appRoutes/interfaces';
import type { RoutesService } from '../appRoutes/services/RoutesService';
import { appSchema, type AppRow } from '../apps/interfaces';
import type { AppsService } from '../apps/services/AppsService';
import { UnprocessableContent } from '../errorHandler/httpErrors';
import { sharedLibSchema } from '../sharedLibs/interfaces';
import type { SharedLibsService } from '../sharedLibs/services/SharedLibsService';
import { parseInput } from '../common/validation/validated';
import { isForeignKeyViolation } from '../util/db';
import { z } from 'zod';

const configItemsSchema = z.array(z.record(z.string(), z.unknown())).optional();

/** Each item is validated with the schema of its entity before it's upserted */
export const configPayloadSchema = z.strictObject({
    apps: configItemsSchema,
    routes: configItemsSchema,
    sharedLibs: configItemsSchema,
});

type UpsertPayload = z.output<typeof configPayloadSchema>;

type UpsertParams = {
    user: User;
    trxProvider: Knex.TransactionProvider;
    dryRun?: boolean;
};

export class ConfigService {
    constructor(
        private readonly db: Knex,
        private readonly apps: AppsService,
        private readonly sharedLibs: SharedLibsService,
        private readonly routes: RoutesService,
    ) {}

    async upsert(payload: UpsertPayload, { user, dryRun }: Omit<UpsertParams, 'trxProvider'>): Promise<void> {
        if (!payload.apps && !payload.routes && !payload.sharedLibs) {
            throw new Error('At least one of the following parameters should be provided: apps, routes, sharedLibs');
        }

        const trxProvider = this.db.transactionProvider();
        const trx = await trxProvider();

        try {
            const upsertedApps = await this.upsertApps(payload.apps ?? [], {
                user,
                trxProvider,
                dryRun,
            });
            const upsertedRoutes = await this.upsertRoutes(payload.routes ?? [], { user, trxProvider });

            const groupedApps = this.groupByNamespace(upsertedApps, 'name');
            const groupedRoutes = this.groupByNamespace(upsertedRoutes, 'id');

            await this.upsertSharedLibs(payload.sharedLibs ?? [], { user, trxProvider, dryRun });
            await this.deleteRoutesByNamespace(groupedRoutes, { user, trxProvider });
            await this.deleteAppsByNamespace(groupedApps, { user, trxProvider });

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

    private async upsertApps(apps: unknown[], { user, trxProvider, dryRun }: UpsertParams): Promise<AppRow[]> {
        return await Promise.all(
            apps.map(async (x) =>
                this.apps.upsert(await parseInput(appSchema, x), { user, trxProvider, fetchManifest: !dryRun }),
            ),
        );
    }

    private async upsertRoutes(routes: unknown[], { user, trxProvider }: UpsertParams): Promise<RouteRow[]> {
        this.validateRoutes(routes);
        const parsedRoutes = await Promise.all(routes.map((route) => parseInput(appRouteSchema, route)));
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
                const sharedLib = await parseInput(sharedLibSchema, x);
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
        { user, trxProvider }: UpsertParams,
    ): Promise<void> {
        await Promise.all(
            Object.keys(upsertedAppsByNamespace).map(
                (namespace) =>
                    namespace &&
                    this.apps.deleteByNamespace(namespace, upsertedAppsByNamespace[namespace], {
                        user,
                        trxProvider,
                    }),
            ),
        );
    }

    public mapError(error: unknown): Error {
        if (this.routes.isOrderPosError(error)) {
            return new UnprocessableContent({
                message:
                    'Specified "orderPos" value already exists for routes with provided "domainId" and "namespace"',
            });
        }
        if (isForeignKeyViolation(error, 'routes_domainid_foreign')) {
            return new UnprocessableContent({ message: 'Specified "domainId" value does not exist' });
        }
        if (isForeignKeyViolation(error, 'routes_templatename_foreign')) {
            return new UnprocessableContent({ message: 'Specified "templateName" value does not exist' });
        }
        if (isForeignKeyViolation(error, 'apps_enforcedomain_foreign')) {
            return new UnprocessableContent({ message: 'Specified "enforceDomain" domainId value does not exist' });
        }

        return error instanceof Error ? error : new Error(String(error));
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

function field(value: unknown, key: string): unknown {
    return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}
