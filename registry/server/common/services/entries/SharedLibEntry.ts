import db from '../../../db';
import SharedLib from '../../../sharedLibs/interfaces';
import { partialSharedLibSchema } from '../../../sharedLibs/interfaces';
import { ValidationFqrnError } from './error/ValidationFqrnError';
import { NotFoundSharedLibraryError } from './error/NotFoundSharedLibraryError';
import { AssetsDiscoveryProcessor } from '../assets/AssetsDiscoveryProcessor';
import { AssetsValidator } from '../assets/AssetsValidator';
import { CommonOptions, Entry } from './Entry';
import { User } from '../../../../typings/User';

export class SharedLibEntry implements Entry {
    private entityName = 'shared_libs' as const;

    constructor(private identifier?: string) {}
    upsert(entity: unknown, options: CommonOptions): Promise<unknown> {
        throw new Error('Method not implemented.');
    }

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

        await db.versioning(user, { type: this.entityName, id: this.identifier }, async (trx) => {
            await db(this.entityName).where({ name: this.identifier }).update(sharedLibEntity).transacting(trx);
        });

        const [updatedSharedLib] = await db.select().from<SharedLib>(this.entityName).where('name', this.identifier);

        return updatedSharedLib;
    }

    public async create(sharedLibDTO: SharedLib, { user }: { user?: User }) {
        const sharedLibraryManifest = await this.getManifest(sharedLibDTO.assetsDiscoveryUrl);

        const sharedLibEntity = {
            ...sharedLibDTO,
            ...sharedLibraryManifest,
        };

        await db.versioning(user, { type: this.entityName, id: sharedLibEntity.name }, async (trx) => {
            await db(this.entityName).insert(sharedLibEntity).transacting(trx);
        });

        const [savedSharedLib] = await db.select().from<SharedLib>(this.entityName).where('name', sharedLibEntity.name);

        return savedSharedLib;
    }

    private async getManifest(assetsDiscoveryUrl: string | undefined) {
        if (!assetsDiscoveryUrl) {
            return {};
        }

        const assetsManifest = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);
        const sharedLibraryManifest = await AssetsValidator.maybeSharedLib(assetsManifest);

        return sharedLibraryManifest;
    }

    private async verifyExistence(identifier: string) {
        const countToUpdate = await db('shared_libs').where({
            name: this.identifier,
        });
        if (countToUpdate.length === 0) {
            throw new NotFoundSharedLibraryError(identifier);
        }
    }
}
