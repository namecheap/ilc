import { App } from '../../server/apps/interfaces';
import { ApplicationEntry } from '../../server/common/services/entries/ApplicationEntry';
import db from '../../server/db';
import { Tables } from '../../server/db/structure';
import { User } from '../../typings/User';
import { expect } from '../common';

const appPayload: App = {
    name: '@portal/upsert',
    kind: 'primary',
    props: {
        a: 1,
    },
};

const user: User = Object.freeze({
    identifier: 'testUser',
    authEntityId: 1,
    role: 'testUser',
});

describe('ApplicationEntry', () => {
    describe('upsert', () => {
        it('should create item', async () => {
            const service = new ApplicationEntry();
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...appPayload, name: '@portal/upsert1' }, { user, trxProvider });
            const trx = await trxProvider();
            await trx.commit();
            const app = await db(Tables.Apps).first().where({ name: '@portal/upsert1' });
            expect(app).to.include({
                name: '@portal/upsert1',
                kind: 'primary',
                props: '{"a":1}',
                ssrProps: '{}',
                ssr: null,
            });
        });
        it('should update item', async () => {
            await db(Tables.Apps).insert({ name: '@portal/upsert2', kind: 'regular' });
            const service = new ApplicationEntry();
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...appPayload, name: '@portal/upsert2' }, { user, trxProvider });
            const trx = await trxProvider();
            await trx.commit();
            const app = await db(Tables.Apps).first().where({ name: '@portal/upsert2' });
            expect(app).to.include({
                name: '@portal/upsert2',
                kind: 'primary',
                props: '{"a":1}',
                ssrProps: '{}',
                ssr: null,
            });
        });
        it('should cancel upsert', async () => {
            await db(Tables.Apps).insert({ name: '@portal/upsert3', kind: 'regular' });
            const service = new ApplicationEntry();
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...appPayload, name: '@portal/upsert3' }, { user, trxProvider });
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
    });
});
