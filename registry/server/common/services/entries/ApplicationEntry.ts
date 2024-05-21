import db from '../../../db';
import SharedLib from '../../../sharedLibs/interfaces';
import { ValidationFqrnError } from './error/ValidationFqrnError';
import { AssetsDiscoveryProcessor } from '../assets/AssetsDiscoveryProcessor';
import { AssetsValidator } from '../assets/AssetsValidator';
import App, { partialAppSchema } from '../../../apps/interfaces';
import { Entry } from './Entry';
import { stringifyJSON } from '../json';
import { NotFoundApplicationError } from './error/NotFoundApplicationError';

export class ApplicationEntry implements Entry {
    private entityName = 'apps' as const;

    constructor(private identifier?: string) {}

    public async patch(params: Partial<App>, { user }: { user: any }) {
        if (!this.identifier) {
            throw new ValidationFqrnError('Patch does not invoked because instance was initialized w/o identifier');
        }

        await this.verifyExistence(this.identifier);

        if (!Object.keys(params).length) {
            throw new ValidationFqrnError('Patch does not contain any items to update');
        }

        const appManifest = await this.getManifest(params.assetsDiscoveryUrl);

        const appEntity = {
            ...params,
            ...appManifest,
        };

        await db.versioning(user, { type: this.entityName, id: this.identifier }, async (trx) => {
            await db(this.entityName)
                .where({ name: this.identifier })
                .update(this.stringifyEntityValues(appEntity))
                .transacting(trx);
        });

        const [updatedApp] = await db.select().from<App>(this.entityName).where('name', this.identifier);

        return updatedApp;
    }

    private stringifyEntityValues(object: Record<string, any>) {
        return stringifyJSON(
            ['dependencies', 'props', 'ssrProps', 'ssr', 'configSelector', 'discoveryMetadata'],
            object,
        );
    }

    public async create(appDTO: App, { user }: { user: any }) {
        const appManifest = await this.getManifest(appDTO.assetsDiscoveryUrl);

        const appEntity = {
            ...appDTO,
            ...appManifest,
        };

        await db.versioning(user, { type: 'apps', id: appEntity.name }, async (trx) => {
            await db('apps').insert(this.stringifyEntityValues(appEntity)).transacting(trx);
        });

        const [savedApp] = await db.select().from<App>(this.entityName).where('name', appEntity.name);

        return savedApp;
    }

    private async getManifest(assetsDiscoveryUrl: string | undefined) {
        if (!assetsDiscoveryUrl) {
            return {};
        }

        const assetsManifest = await AssetsDiscoveryProcessor.process(assetsDiscoveryUrl);
        const appManifest = await AssetsValidator.maybeApp(assetsManifest);

        return appManifest;
    }

    private async verifyExistence(identifier: string) {
        const countToUpdate = await db(this.entityName).where({
            name: this.identifier,
        });
        if (countToUpdate.length === 0) {
            throw new NotFoundApplicationError(identifier);
        }
    }
}
