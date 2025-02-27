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
    });
});
