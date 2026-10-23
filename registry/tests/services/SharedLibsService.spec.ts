import path from 'node:path';
import { VersionedKnex } from '../../server/db';
import { Tables } from '../../server/db/structure';
import { User } from '../../typings/User';
import { dbFactory, expect } from '../common';
import { sharedLibSchema } from '../../server/sharedLibs/interfaces';
import { SharedLibsRepository } from '../../server/sharedLibs/repositories/SharedLibsRepository';
import { SharedLibsService } from '../../server/sharedLibs/services/SharedLibsService';
import versioningConfig from '../../server/versioning/config';
import { Versioning } from '../../server/versioning/services/Versioning';

const sharedLibPayload = {
    name: 'upsert',
    spaBundle: 'https://example.com/lib2.js',
    adminNotes: 'Lorem ipsum admin notes dolor sit',
};

const user: User = Object.freeze({
    identifier: 'testUser',
    authEntityId: 1,
    role: 'testUser',
});

describe('SharedLibsService', () => {
    let db: VersionedKnex;
    let reset: () => Promise<void>;
    let service: SharedLibsService;
    before(async () => {
        ({ db, reset } = await dbFactory());
        await db.migrate.latest({
            directory: path.join(__dirname, '../../server/migrations'),
        });
        const versioning = new Versioning(versioningConfig, db);
        service = new SharedLibsService(new SharedLibsRepository(versioning), versioning);
    });
    after(async () => {
        await reset();
    });
    describe('upsert', () => {
        it('should create item', async () => {
            const trxProvider = db.transactionProvider();
            await service.upsert(sharedLibSchema.parse({ ...sharedLibPayload, name: '@portal/upsert1' }), {
                user,
                trxProvider,
            });
            const trx = await trxProvider();
            await trx.commit();
            const lib = await db(Tables.SharedLibs).first().where({ name: '@portal/upsert1' });
            expect(lib).to.deep.include({
                name: '@portal/upsert1',
                spaBundle: 'https://example.com/lib2.js',
                adminNotes: 'Lorem ipsum admin notes dolor sit',
            });
        });
        it('should update item', async () => {
            await db(Tables.SharedLibs).insert({
                name: '@portal/upsert2',
                assetsDiscoveryUrl: '',
                spaBundle: 'https://example.com/lib1.js',
                l10nManifest: 'existing',
            });
            const trxProvider = db.transactionProvider();
            await service.upsert(sharedLibSchema.parse({ ...sharedLibPayload, name: '@portal/upsert2' }), {
                user,
                trxProvider,
            });
            const trx = await trxProvider();
            await trx.commit();
            const lib = await db(Tables.SharedLibs).first().where({ name: '@portal/upsert2' });
            expect(lib).to.deep.include({
                name: '@portal/upsert2',
                spaBundle: 'https://example.com/lib2.js',
                adminNotes: 'Lorem ipsum admin notes dolor sit',
                l10nManifest: 'existing',
            });
        });
        it('should cancel upsert', async () => {
            await db(Tables.SharedLibs).insert({ name: '@portal/upsert3', spaBundle: '' });
            const trxProvider = db.transactionProvider();
            await service.upsert(
                sharedLibSchema.parse({
                    ...sharedLibPayload,
                    name: '@portal/upsert3',
                    spaBundle: 'http://localhost/new',
                }),
                { user, trxProvider },
            );
            const trx = await trxProvider();
            await trx.rollback();
            const lib = await db(Tables.SharedLibs).first().where({ name: '@portal/upsert3' });
            expect(lib).to.include({
                name: '@portal/upsert3',
                spaBundle: '',
            });
        });
        it('should leave invalid input to the schema, which rejects it', async () => {
            expect(() =>
                sharedLibSchema.parse({ ...sharedLibPayload, spaBundle: 1, name: '@portal/upsert4' }),
            ).to.throw('expected string, received number');
        });
        it('should not rewrite specific properties if not applied', async () => {
            await db(Tables.SharedLibs).insert({
                name: '@portal/upsert6',
                spaBundle: 'http://localhost/new',
                assetsDiscoveryUrl: 'http://localhost/new',
                l10nManifest: 'existing',
                adminNotes: 'existing',
            });
            const trxProvider = db.transactionProvider();
            await service.upsert(
                sharedLibSchema.parse({ name: '@portal/upsert6', spaBundle: 'http://localhost/new' }),
                { user, trxProvider },
            );
            const trx = await trxProvider();
            await trx.commit();
            const lib = await db(Tables.SharedLibs).first().where({ name: '@portal/upsert6' });
            expect(lib).to.deep.include({
                name: '@portal/upsert6',
                assetsDiscoveryUrl: null,
                spaBundle: 'http://localhost/new',
                l10nManifest: 'existing',
                adminNotes: 'existing',
            });
        });
    });
});
