import path from 'node:path';
import { VersionedKnex } from '../../server/db';
import { Tables } from '../../server/db/structure';
import { User } from '../../typings/User';
import { dbFactory, expect } from '../common';
import { SharedLibEntry } from '../../server/common/services/entries/SharedLibEntry';

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

describe('SharedLibraryEntry', () => {
    let db: VersionedKnex;
    let reset: () => Promise<void>;
    before(async () => {
        ({ db, reset } = dbFactory());
        await db.migrate.latest({
            directory: path.join(__dirname, '../../server/migrations'),
        });
    });
    after(async () => {
        await reset();
    });
    describe('upsert', () => {
        it('should create item', async () => {
            const service = new SharedLibEntry(db);
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...sharedLibPayload, name: '@portal/upsert1' }, { user, trxProvider });
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
            const service = new SharedLibEntry(db);
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...sharedLibPayload, name: '@portal/upsert2' }, { user, trxProvider });
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
            const service = new SharedLibEntry(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(
                { ...sharedLibPayload, name: '@portal/upsert3', spaBundle: 'http://localhost/new' },
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
        it('should throw on validation error', async () => {
            const service = new SharedLibEntry(db);
            const trxProvider = db.transactionProvider();
            await expect(
                service.upsert({ ...sharedLibPayload, spaBundle: 1, name: '@portal/upsert4' }, { user, trxProvider }),
            ).eventually.rejectedWith('"spaBundle" must be a string');
            const trx = await trxProvider();
            await trx.rollback();
            const lib = await db(Tables.SharedLibs).first().where({ name: '@portal/upsert4' });
            expect(lib).to.undefined;
        });
        it('should not rewrite specific properties if not applied', async () => {
            await db(Tables.SharedLibs).insert({
                name: '@portal/upsert6',
                spaBundle: 'http://localhost/new',
                l10nManifest: 'existing',
            });
            const service = new SharedLibEntry(db);
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...sharedLibPayload, name: '@portal/upsert6' }, { user, trxProvider });
            const trx = await trxProvider();
            await trx.commit();
            const lib = await db(Tables.SharedLibs).first().where({ name: '@portal/upsert6' });
            expect(lib).to.deep.include({
                name: '@portal/upsert6',
                spaBundle: 'https://example.com/lib2.js',
                l10nManifest: 'existing',
            });
        });
    });
});
