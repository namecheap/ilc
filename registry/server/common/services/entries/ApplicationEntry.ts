import { App, appSchema, partialAppSchema } from '../../../apps/interfaces';
import { VersionedKnex } from '../../../db';
import { Tables } from '../../../db/structure';
import { EntityTypes } from '../../../versioning/interfaces';
import { AssetsDiscoveryProcessor } from '../assets/AssetsDiscoveryProcessor';
import { AssetsValidator } from '../assets/AssetsValidator';
import { stringifyJSON } from '../json';
import { CommonOptions, Entry } from './Entry';
import { NotFoundApplicationError } from './error/NotFoundApplicationError';
import { ValidationFqrnError } from './error/ValidationFqrnError';

type UpsertOptions = CommonOptions & {
    fetchManifest?: boolean;
};

export class ApplicationEntry implements Entry {
    constructor(
        private readonly db: VersionedKnex,
        private identifier?: string,
    ) {}

    public async patch(params: unknown, { user }: CommonOptions): Promise<App> {
        if (!this.identifier) {
            throw new ValidationFqrnError('Patch does not invoked because instance was initialized w/o identifier');
        }

        await this.verifyExistence(this.identifier);

        const appDTO = await partialAppSchema.validateAsync(params, {
            abortEarly: true,
            presence: 'optional',
        });

        const partialAppDTO = this.cleanComplexDefaultKeys(appDTO, params);

        if (!Object.keys(partialAppDTO).length) {
            throw new ValidationFqrnError('Patch does not contain any items to update');
        }

        const appManifest = await this.getManifest(partialAppDTO.assetsDiscoveryUrl);

        const appEntity = {
            ...partialAppDTO,
            ...appManifest,
        };

        await this.db.versioning(user, { type: EntityTypes.apps, id: this.identifier }, async (trx) => {
            await this.db(Tables.Apps)
                .where({ name: this.identifier })
                .update(this.stringifyEntityValues(appEntity))
                .transacting(trx);
        });

        const [updatedApp] = await this.db.select().from(Tables.Apps).where('name', this.identifier);

        return updatedApp;
    }

    private stringifyEntityValues<T extends Partial<App>>(object: T) {
        return stringifyJSON(
            ['dependencies', 'props', 'ssrProps', 'ssr', 'configSelector', 'discoveryMetadata'],
            object,
        );
    }

    public async create(appDTO: App, { user }: CommonOptions) {
        const appManifest = await this.getManifest(appDTO.assetsDiscoveryUrl);

        const appEntity = {
            ...appDTO,
            ...appManifest,
        };

        await this.db.versioning(user, { type: EntityTypes.apps, id: appEntity.name }, async (trx) => {
            await this.db(Tables.Apps).insert(this.stringifyEntityValues(appEntity)).transacting(trx);
        });

        const [savedApp] = await this.db.select().from(Tables.Apps).where('name', appEntity.name);

        return savedApp;
    }

    public async upsert(params: unknown, { user, trxProvider, fetchManifest = true }: UpsertOptions): Promise<void> {
        const appDto = await appSchema.validateAsync(params, { noDefaults: true, externals: true });

        const appManifest = fetchManifest ? await this.getManifest(appDto.assetsDiscoveryUrl) : {};

        const appEntity = {
            ...appDto,
            ...appManifest,
        };

        await this.db.versioning(user, { type: EntityTypes.apps, id: appEntity.name, trxProvider }, async (trx) => {
            await this.db(Tables.Apps)
                .insert(this.stringifyEntityValues(appEntity))
                .onConflict(this.db.raw('(name, namespace) WHERE namespace IS NOT NULL'))
                .merge()
                .transacting(trx);
        });
    }

    private cleanComplexDefaultKeys(appDTO: Omit<App, 'name'>, params: unknown) {
        if (typeof params === 'object' && params !== null) {
            const assertedParams = params as Record<string, any>;

            return Object.keys(appDTO).reduce<Partial<App>>((partialApp, key: string) => {
                const typedKey = key as keyof Omit<App, 'name'>;

                if (typeof assertedParams[typedKey] !== 'undefined') {
                    partialApp[typedKey] = appDTO[typedKey] as any;
                }

                return partialApp;
            }, {});
        }

        return appDTO;
    }

    private async getManifest(assetsDiscoveryUrl: string | undefined | null) {
        if (!assetsDiscoveryUrl) {
            return {};
        }

        const assetsManifest = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);
        const appManifest = await AssetsValidator.maybeApp(assetsManifest);

        return appManifest;
    }

    private async verifyExistence(identifier: string) {
        const countToUpdate = await this.db(Tables.Apps).where({
            name: this.identifier,
        });
        if (countToUpdate.length === 0) {
            throw new NotFoundApplicationError(identifier);
        }
    }
}
