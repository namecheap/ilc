import { User } from '../../../../typings/User';
import { type VersionedKnex } from '../../../db';
import { Tables } from '../../../db/structure';
import { partialSharedLibSchema, SharedLib, sharedLibSchema } from '../../../sharedLibs/interfaces';
import { EntityTypes } from '../../../versioning/interfaces';
import { AssetsDiscoveryProcessor } from '../assets/AssetsDiscoveryProcessor';
import { AssetsValidator } from '../assets/AssetsValidator';
import { CommonOptions, Entry } from './Entry';
import { NotFoundSharedLibraryError } from './error/NotFoundSharedLibraryError';
import { ValidationFqrnError } from './error/ValidationFqrnError';

type UpsertOptions = CommonOptions & {
    fetchManifest?: boolean;
};

export class SharedLibEntry implements Entry {
    constructor(
        private readonly db: VersionedKnex,
        private identifier?: string,
    ) {}

    public async patch(params: unknown, { user }: { user?: User }) {
        if (!this.identifier) {
            throw new ValidationFqrnError('Patch does not invoked because instance was initialized w/o identifier');
        }

        await this.verifyExistence(this.identifier);

        const sharedLibDTO = await partialSharedLibSchema.validateAsync(params, {
            noDefaults: true,
            abortEarly: true,
            presence: 'optional',
        });

        if (!Object.keys(sharedLibDTO).length) {
            throw new ValidationFqrnError('Patch does not contain any items to update');
        }

        const sharedLibraryManifest = await this.getManifest(sharedLibDTO.assetsDiscoveryUrl);

        const sharedLibEntity = {
            ...sharedLibDTO,
            ...sharedLibraryManifest,
        };

        await this.db.versioning(user, { type: EntityTypes.shared_libs, id: this.identifier }, async (trx) => {
            await this.db(Tables.SharedLibs).where({ name: this.identifier }).update(sharedLibEntity).transacting(trx);
        });

        const [updatedSharedLib] = await this.db(Tables.SharedLibs).select().where('name', this.identifier);

        return updatedSharedLib;
    }

    public async create(sharedLibDTO: SharedLib, { user }: { user?: User }) {
        const sharedLibraryManifest = await this.getManifest(sharedLibDTO.assetsDiscoveryUrl);

        const sharedLibEntity = {
            ...sharedLibDTO,
            ...sharedLibraryManifest,
        };

        await this.db.versioning(user, { type: EntityTypes.shared_libs, id: sharedLibEntity.name }, async (trx) => {
            await this.db(Tables.SharedLibs).insert(sharedLibEntity).transacting(trx);
        });

        const [savedSharedLib] = await this.db(Tables.SharedLibs).select().where('name', sharedLibEntity.name);

        return savedSharedLib;
    }
    public async upsert(entity: unknown, { user, trxProvider, fetchManifest = true }: UpsertOptions): Promise<void> {
        const sharedLibDto = await sharedLibSchema.validateAsync(entity, { noDefaults: true });

        const sharedLibManifest = fetchManifest
            ? await this.getManifest(sharedLibDto.assetsDiscoveryUrl)
            : { spaBundle: '' };

        const sharedLibEntity = {
            ...sharedLibDto,
            ...sharedLibManifest,
        };

        await this.db.versioning(
            user,
            { type: EntityTypes.shared_libs, id: sharedLibEntity.name, trxProvider },
            async (trx) => {
                await this.db(Tables.SharedLibs).insert(sharedLibEntity).onConflict('name').merge().transacting(trx);
            },
        );
    }

    private async getManifest(assetsDiscoveryUrl: string | null | undefined) {
        if (!assetsDiscoveryUrl) {
            return {};
        }

        const assetsManifest = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);
        const sharedLibraryManifest = await AssetsValidator.maybeSharedLib(assetsManifest);

        return sharedLibraryManifest;
    }

    private async verifyExistence(identifier: string) {
        const countToUpdate = await this.db(Tables.SharedLibs).where({
            name: this.identifier,
        });
        if (countToUpdate.length === 0) {
            throw new NotFoundSharedLibraryError(identifier);
        }
    }
}
