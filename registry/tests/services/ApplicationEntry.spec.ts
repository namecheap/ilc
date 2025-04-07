import path from 'node:path';
import { ApplicationEntry } from '../../server/common/services/entries/ApplicationEntry';
import { VersionedKnex } from '../../server/db';
import { Tables } from '../../server/db/structure';
import { User } from '../../typings/User';
import { dbFactory, expect } from '../common';

const appPayload = {
    name: '@portal/upsert',
    kind: 'primary',
    props: {
        a: 1,
    },
    namespace: 'ns1',
};

const user: User = Object.freeze({
    identifier: 'testUser',
    authEntityId: 1,
    role: 'testUser',
});

describe('ApplicationEntry', () => {
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
            const service = new ApplicationEntry(db);
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...appPayload, name: '@portal/upsert1' }, { user, trxProvider });
            const trx = await trxProvider();
            await trx.commit();
            const app = await db(Tables.Apps).first().where({ name: '@portal/upsert1' });
            expect(app).to.deep.include({
                name: '@portal/upsert1',
                kind: 'primary',
                props: '{"a":1}',
                ssrProps: '{}',
                ssr: null,
            });
        });
        it('should update item', async () => {
            await db(Tables.Apps).insert({ name: '@portal/upsert2', kind: 'regular', namespace: 'ns1' });
            const service = new ApplicationEntry(db);
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...appPayload, name: '@portal/upsert2' }, { user, trxProvider });
            const trx = await trxProvider();
            await trx.commit();
            const app = await db(Tables.Apps).first().where({ name: '@portal/upsert2' });
            expect(app).to.deep.include({
                name: '@portal/upsert2',
                kind: 'primary',
                props: '{"a":1}',
                ssrProps: '{}',
                ssr: null,
            });
        });
        it('should not rewrite specific properties if not applied', async () => {
            await db(Tables.Templates).insert({ name: '500', content: '' });
            await db(Tables.RouterDomains).insert({ id: 1, domainName: 'example.com', template500: '500' });
            await db(Tables.Apps).insert({
                name: '@portal/upsert6',
                kind: 'primary',
                namespace: 'ns1',
                l10nManifest: 'existing',
                spaBundle: 'existing',
                cssBundle: 'existing',
                adminNotes: 'existing',
                assetsDiscoveryUrl: 'existing',
                dependencies: '{"a": 1}',
                props: '{"a": 1}',
                ssrProps: '{"a": 1}',
                discoveryMetadata: '{"a": 1}',
                enforceDomain: 1,
                ssr: '{"src": "http://localhost/ssr", "timeout": 100}',
                configSelector: '["react"]',
                wrappedWith: '@portal/upsert1',
            });
            const service = new ApplicationEntry(db);
            const trxProvider = db.transactionProvider();
            await service.upsert({ name: '@portal/upsert6', namespace: 'ns1' }, { user, trxProvider });
            const trx = await trxProvider();
            await trx.commit();
            const app = await db(Tables.Apps).first().where({ name: '@portal/upsert6' });
            expect(app).to.deep.include({
                name: '@portal/upsert6',
                kind: 'regular',
                namespace: 'ns1',
                l10nManifest: 'existing',
                spaBundle: 'existing',
                cssBundle: 'existing',
                adminNotes: 'existing',
                assetsDiscoveryUrl: null,
                dependencies: '{}',
                props: '{}',
                ssrProps: '{}',
                discoveryMetadata: '{}',
                enforceDomain: null,
                ssr: null,
                configSelector: '[]',
                wrappedWith: null,
            });
        });
        it('should cancel upsert', async () => {
            await db(Tables.Apps).insert({ name: '@portal/upsert3', kind: 'regular', namespace: 'ns1' });
            const service = new ApplicationEntry(db);
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...appPayload, name: '@portal/upsert3', kind: 'primary' }, { user, trxProvider });
            const trx = await trxProvider();
            await trx.rollback();
            const app = await db(Tables.Apps).first().where({ name: '@portal/upsert3' });
            expect(app).to.include({
                name: '@portal/upsert3',
                kind: 'regular',
                props: null,
                ssrProps: null,
                ssr: null,
            });
        });
        it('should throw on validation error', async () => {
            const service = new ApplicationEntry(db);
            const trxProvider = db.transactionProvider();
            await expect(
                service.upsert(
                    { ...appPayload, name: '@portal/upsert4', kind: 'unknown', namespace: 'ns1' },
                    { user, trxProvider },
                ),
            ).eventually.rejectedWith('"kind" must be one of [primary, essential, regular, wrapper]');
            const trx = await trxProvider();
            await trx.rollback();
            const app = await db(Tables.Apps).first().where({ name: '@portal/upsert4' });
            expect(app).to.undefined;
        });
        it('should throw on constraint fail', async () => {
            await db(Tables.Apps).insert({ name: '@portal/upsert4', kind: 'regular', namespace: 'ns1' });
            const service = new ApplicationEntry(db);
            const trxProvider = db.transactionProvider();
            await expect(
                service.upsert(
                    { ...appPayload, name: '@portal/upsert4', kind: 'primary', namespace: 'ns2' },
                    { user, trxProvider },
                ),
            ).eventually.rejectedWith('UNIQUE constraint failed');
            const trx = await trxProvider();
            await trx.rollback();
            const app = await db(Tables.Apps).first().where({ name: '@portal/upsert4' });
            expect(app).to.include({
                name: '@portal/upsert4',
                kind: 'regular',
                props: null,
                ssrProps: null,
                ssr: null,
            });
        });
        it('should delete by namespace', async () => {
            await db(Tables.Apps).insert({ name: '@portal/upsert5', kind: 'regular', namespace: 'ns1' });
            await db(Tables.Apps).insert({ name: '@portal/upsert5_1', kind: 'regular', namespace: 'ns1' });
            await db(Tables.Apps).insert({ name: '@portal/upsert5_2', kind: 'regular', namespace: 'ns2' });
            const service = new ApplicationEntry(db);
            const trxProvider = db.transactionProvider();
            await service.deleteByNamespace('ns1', ['@portal/upsert5_1'], { user, trxProvider });
            const trx = await trxProvider();
            await trx.commit();
            const app1 = await db(Tables.Apps).first().where({ name: '@portal/upsert5' });
            expect(app1).to.undefined;
            const app2 = await db(Tables.Apps).first().where({ name: '@portal/upsert5_1' });
            expect(app2).to.deep.include({
                name: '@portal/upsert5_1',
            });
            const app3 = await db(Tables.Apps).first().where({ name: '@portal/upsert5_2' });
            expect(app3).to.deep.include({
                name: '@portal/upsert5_2',
            });
        });
    });
});
