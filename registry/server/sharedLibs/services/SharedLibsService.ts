import type { Knex } from 'knex';

import type { PaginatedResult } from '../../../typings/PaginatedResult';
import type { User } from '../../../typings/User';
import { AssetsDiscoveryProcessor } from '../../common/services/assets/AssetsDiscoveryProcessor';
import { AssetsValidator } from '../../common/services/assets/AssetsValidator';
import { NotFoundSharedLibraryError } from '../../common/services/entries/error/NotFoundSharedLibraryError';
import { ValidationFqrnError } from '../../common/services/entries/error/ValidationFqrnError';
import { NotFoundError } from '../../errorHandler/httpErrors';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { PartialSharedLibInput, SharedLibInput, SharedLibRow, SharedLibsFilters } from '../interfaces';
import type { SharedLibInsert, SharedLibsRepository } from '../repositories/SharedLibsRepository';

type UpsertOptions = {
    user: User | undefined;
    trxProvider: Knex.TransactionProvider;
    fetchManifest?: boolean;
};

export class SharedLibsService {
    constructor(
        private readonly repository: SharedLibsRepository,
        private readonly versioning: Versioning,
    ) {}

    list(
        filters: SharedLibsFilters,
        range: string | undefined,
    ): Promise<PaginatedResult<VersionedRecord<SharedLibRow>>> {
        return this.repository.list(filters, range);
    }

    get(name: string): Promise<VersionedRecord<SharedLibRow> | undefined> {
        return this.repository.findByName(name);
    }

    async create(sharedLib: SharedLibInput, user: User | undefined): Promise<SharedLibRow> {
        const manifest = await AssetsDiscoveryProcessor.fetchManifest(
            sharedLib.assetsDiscoveryUrl,
            AssetsValidator.maybeSharedLib,
        );
        const toInsert = withSpaBundle(sharedLib, manifest);

        return this.versioning.withVersion(user, { type: EntityTypes.shared_libs, id: sharedLib.name }, (trx) =>
            this.repository.insert(toInsert, trx),
        );
    }

    async update(name: string, sharedLib: PartialSharedLibInput, user: User | undefined): Promise<SharedLibRow> {
        if (!(await this.repository.exists(name))) {
            throw new NotFoundSharedLibraryError(name);
        }
        if (Object.values(sharedLib).every((value) => value === undefined)) {
            throw new ValidationFqrnError('Patch does not contain any items to update');
        }

        const manifest = await AssetsDiscoveryProcessor.fetchManifest(
            sharedLib.assetsDiscoveryUrl,
            AssetsValidator.maybeSharedLib,
        );
        const toUpdate = { ...sharedLib, ...manifest };

        return this.versioning.withVersion(user, { type: EntityTypes.shared_libs, id: name }, async (trx) => {
            const updated = await this.repository.update(name, toUpdate, trx);
            if (!updated) {
                throw new NotFoundSharedLibraryError(name);
            }
            return updated;
        });
    }

    /** Creates or replaces the shared library inside the caller's transaction, for config upserts */
    async upsert(sharedLib: SharedLibInput, { user, trxProvider, fetchManifest = true }: UpsertOptions): Promise<void> {
        const manifest = fetchManifest
            ? await AssetsDiscoveryProcessor.fetchManifest(sharedLib.assetsDiscoveryUrl, AssetsValidator.maybeSharedLib)
            : { spaBundle: '' };
        const toUpsert = withSpaBundle(sharedLib, manifest);

        await this.versioning.withVersion(
            user,
            { type: EntityTypes.shared_libs, id: sharedLib.name, trxProvider },
            (trx) => this.repository.upsert(toUpsert, trx),
        );
    }

    async delete(name: string, user: User | undefined): Promise<void> {
        await this.versioning.withVersion(user, { type: EntityTypes.shared_libs, id: name }, async (trx) => {
            const count = await this.repository.delete(name, trx);
            if (!count) {
                throw new NotFoundError();
            }
        });
    }
}

function withSpaBundle(sharedLib: SharedLibInput, manifest: { spaBundle?: string }): SharedLibInsert {
    const spaBundle = manifest.spaBundle ?? sharedLib.spaBundle;
    if (spaBundle === undefined) {
        // The schema requires spaBundle unless there is an assetsDiscoveryUrl, whose manifest has one
        throw new Error(`Shared library "${sharedLib.name}" has no spaBundle`);
    }
    return { ...sharedLib, spaBundle };
}
