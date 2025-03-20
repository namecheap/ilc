import { App } from 'supertest/types';
import db, { VersionedKnex } from '../db';
import { AppRouteDto } from './transformConfig';
import { EntryFactory } from '../common/services/entries/EntryFactory';
import { SharedLib } from '../sharedLibs/interfaces';
import { User } from '../../typings/User';
import { routesService } from '../appRoutes/routes/RoutesService';
import { isPostgres, PG_FOREIGN_KEY_VIOLATION_CODE } from '../util/db';
import { getJoiErr } from '../util/helpers';

type UpsertPayload = {
    apps?: App[];
    routes?: AppRouteDto[];
    sharedLibs?: SharedLib[];
};

type UpsertParams = {
    user: User;
    dryRun?: boolean;
};

export class ConfigService {
    constructor(private readonly db: VersionedKnex) {}

    async upsert(payload: UpsertPayload, { user, dryRun }: UpsertParams) {
        const appInstance = EntryFactory.getAppInstance();
        const sharedLibInstance = EntryFactory.getSharedLibInstance();

        if (!isPostgres(this.db)) {
            throw new Error('Upsert config is supported only if using PostgreSQL');
        }

        const trxProvider = this.db.transactionProvider();
        try {
            await Promise.all(
                payload.apps?.map((x) => appInstance.upsert(x, { user, trxProvider, fetchManifest: !dryRun })) ?? [],
            );
            await Promise.all(payload.routes?.map((x) => routesService.upsert(x, user, trxProvider)) ?? []);
            await Promise.all(
                payload.sharedLibs?.map((x) =>
                    sharedLibInstance.upsert(x, { user, trxProvider, fetchManifest: !dryRun }),
                ) ?? [],
            );
            const trx = await trxProvider();
            if (dryRun) {
                await trx.rollback();
            } else {
                await trx.commit();
            }
        } catch (error) {
            const trx = await trxProvider();
            await trx.rollback();
            throw error;
        }
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
