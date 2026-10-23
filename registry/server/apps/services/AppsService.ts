import { Knex } from 'knex';

import type { PaginatedResult } from '../../../typings/PaginatedResult';
import { User } from '../../../typings/User';
import { AssetsDiscoveryProcessor } from '../../common/services/assets/AssetsDiscoveryProcessor';
import { AssetsValidator } from '../../common/services/assets/AssetsValidator';
import { NotFoundApplicationError } from '../../common/services/entries/error/NotFoundApplicationError';
import { ValidationFqrnError } from '../../common/services/entries/error/ValidationFqrnError';
import { ConflictError, NotFoundError, UnprocessableContent } from '../../errorHandler/httpErrors';
import type { RouterDomainsRepository } from '../../routerDomains/repositories/RouterDomainsRepository';
import { isUniqueConstraintError } from '../../util/db';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { AppInput, AppRow, AppsFilters, PartialAppInput } from '../interfaces';
import type { AppInsert, AppsRepository, AppUpdate } from '../repositories/AppsRepository';

type UpsertOptions = {
    user: User | undefined;
    trxProvider: Knex.TransactionProvider;
    fetchManifest?: boolean;
};

export class AppsService {
    constructor(
        private readonly repository: AppsRepository,
        private readonly routerDomainsRepository: RouterDomainsRepository,
        private readonly versioning: Versioning,
    ) {}

    list(filters: AppsFilters, range: string | undefined): Promise<PaginatedResult<VersionedRecord<AppRow>>> {
        return this.repository.getList(filters, range);
    }

    get(name: string): Promise<VersionedRecord<AppRow> | undefined> {
        return this.repository.findByName(name);
    }

    public async create(app: AppInput, user: User | undefined): Promise<AppRow> {
        const toInsert = await this.toInsert(app, true);

        try {
            return await this.versioning.withVersion(user, { type: EntityTypes.apps, id: app.name }, (trx) =>
                this.repository.insert(toInsert, trx),
            );
        } catch (error) {
            if (isUniqueConstraintError(error, 'apps_pkey')) {
                throw new ConflictError({ message: `App with name "${app.name}" already exists` });
            }
            throw error;
        }
    }

    public async patch(name: string, app: PartialAppInput, user: User | undefined): Promise<AppRow> {
        if (!(await this.repository.exists(name))) {
            throw new NotFoundApplicationError(name);
        }
        await this.assertWrapper(app.wrappedWith);

        if (Object.values(app).every((value) => value === undefined)) {
            throw new ValidationFqrnError('Patch does not contain any items to update');
        }

        const { domainAlias, configSelector, ...fields } = app;
        const enforceDomain = await this.resolveEnforceDomain(app);
        const manifest = await getManifest(app.assetsDiscoveryUrl);
        const toUpdate: AppUpdate = {
            ...fields,
            enforceDomain,
            configSelector: configSelector === undefined ? undefined : JSON.stringify(configSelector),
            ...manifest,
        };

        return this.versioning.withVersion(user, { type: EntityTypes.apps, id: name }, async (trx) => {
            const updated = await this.repository.update(name, toUpdate, trx);
            if (!updated) {
                throw new NotFoundApplicationError(name);
            }
            return updated;
        });
    }

    /** Creates or replaces the app inside the caller's transaction, for config upserts */
    public async upsert(app: AppInput, { user, trxProvider, fetchManifest = true }: UpsertOptions): Promise<AppRow> {
        const toUpsert = await this.toInsert(app, fetchManifest);

        return this.versioning.withVersion(user, { type: EntityTypes.apps, id: app.name, trxProvider }, (trx) =>
            this.repository.upsert(toUpsert, trx),
        );
    }

    async delete(name: string, user: User | undefined): Promise<void> {
        await this.versioning.withVersion(user, { type: EntityTypes.apps, id: name }, async (trx) => {
            const count = await this.repository.delete(name, trx);
            if (!count) {
                throw new NotFoundError();
            }
        });
    }

    public async deleteByNamespace(
        namespace: string,
        excludeNames: string[],
        { user, trxProvider }: { user: User; trxProvider: Knex.TransactionProvider },
    ) {
        const appNamesToDelete = await this.repository.findNamesByNamespace(
            namespace,
            excludeNames,
            await trxProvider(),
        );
        await Promise.all(
            appNamesToDelete.map(async (name) => {
                await this.versioning.withVersion(user, { type: EntityTypes.apps, id: name, trxProvider }, (trx) =>
                    this.repository.delete(name, trx),
                );
            }),
        );
    }

    private async toInsert(app: AppInput, fetchManifest: boolean): Promise<AppInsert> {
        await this.assertWrapper(app.wrappedWith);

        const { domainAlias, configSelector, ...fields } = app;
        const enforceDomain = (await this.resolveEnforceDomain(app)) ?? null;
        const manifest = fetchManifest ? await getManifest(app.assetsDiscoveryUrl) : {};

        return { ...fields, enforceDomain, configSelector: JSON.stringify(configSelector), ...manifest };
    }

    /** An app can only be wrapped by an app of the wrapper kind */
    private async assertWrapper(wrappedWith: string | null | undefined): Promise<void> {
        if (!wrappedWith) {
            return;
        }
        if ((await this.repository.findKind(wrappedWith)) !== 'wrapper') {
            throw new UnprocessableContent({ message: 'Specified wrapper app is not a wrapper.' });
        }
    }

    /** domainAlias names the router domain to enforce, instead of its id */
    private async resolveEnforceDomain({
        enforceDomain,
        domainAlias,
    }: {
        enforceDomain?: number | null;
        domainAlias?: string;
    }): Promise<number | null | undefined> {
        if (!domainAlias) {
            return enforceDomain;
        }

        const domainId = await this.routerDomainsRepository.findIdByAlias(domainAlias);
        if (domainId === undefined) {
            throw new UnprocessableContent({ message: `Router domain with alias "${domainAlias}" does not exist` });
        }
        return domainId;
    }
}

async function getManifest(assetsDiscoveryUrl: string | null | undefined) {
    if (!assetsDiscoveryUrl) {
        return {};
    }

    const assetsManifest = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);
    return AssetsValidator.maybeApp(assetsManifest);
}
