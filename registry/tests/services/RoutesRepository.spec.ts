import path from 'path';
import { VersionedKnex } from '../../server/db';
import { User } from '../../typings/User';
import { dbFactory, expect } from '../common';
import { RoutesRepository } from '../../server/appRoutes/routes/routesRepository';
import { Tables } from '../../server/db/structure';

const user: User = Object.freeze({
    identifier: 'testUser',
    authEntityId: 1,
    role: 'testUser',
});

const appRoute = {
    orderPos: 1,
    route: '/upsert1',
    next: false,
    templateName: 'master',
    meta: {
        a: 1,
    },
    domainId: null,
};

const appRouteSlots = {
    ncTestRouteSlotName: {
        appName: '@portal/upsert',
        props: { ncTestProp: 1 },
        kind: 'regular' as const,
    },
};

describe('RoutesRepository', () => {
    let db: VersionedKnex;
    let reset: () => Promise<void>;
    before(async () => {
        ({ db, reset } = dbFactory());
        await db.migrate.latest({
            directory: path.join(__dirname, '../../server/migrations'),
        });
        await db('apps').insert({ name: '@portal/upsert', kind: 'primary' });
        await db('templates').insert({ name: 'master', content: 'content' });
    });
    after(async () => {
        await reset();
    });
    describe('upsert', () => {
        it('should create item', async () => {
            const service = new RoutesRepository(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(appRoute, appRouteSlots, user, trxProvider);
            const trx = await trxProvider();
            await trx.commit();
            const route = await db(Tables.Routes).first().where({ route: '/upsert1' });
            expect(route).to.deep.include({
                orderPos: 1,
                route: '/upsert1',
                next: 0,
                meta: '{"a":1}',
                domainId: null,
            });
        });
        it('should update item', async () => {
            await db(Tables.Routes).insert({ route: '/upsert2', namespace: 'ns1', orderPos: 2 });
            const service = new RoutesRepository(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(
                { ...appRoute, route: '/upsert2', namespace: 'ns1', orderPos: 22 },
                {},
                user,
                trxProvider,
            );
            const trx = await trxProvider();
            await trx.commit();
            const app = await db(Tables.Routes).first().where({ route: '/upsert2' });
            expect(app).to.deep.include({
                orderPos: 22,
                route: '/upsert2',
                next: 0,
                meta: '{"a":1}',
                domainId: null,
            });
        });
        it('should cancel upsert', async () => {
            await db(Tables.Routes).insert({ route: '/upsert3', namespace: 'ns1', orderPos: 3 });
            const service = new RoutesRepository(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(
                { ...appRoute, route: '/upsert3', namespace: 'ns1', orderPos: 33 },
                {},
                user,
                trxProvider,
            );
            const trx = await trxProvider();
            await trx.rollback();
            const app = await db(Tables.Routes).first().where({ route: '/upsert3' });
            expect(app).to.include({
                orderPos: 3,
                route: '/upsert3',
                next: 0,
                templateName: null,
                meta: null,
                domainId: null,
                namespace: 'ns1',
            });
        });
        it('should throw on constraint fail', async () => {
            await db(Tables.Routes).insert({ route: '/upsert4', namespace: 'ns1', orderPos: 4 });
            const service = new RoutesRepository(db);
            const trxProvider = db.transactionProvider();
            await expect(
                service.upsert(
                    { ...appRoute, route: '/upsert4', namespace: 'ns1', orderPos: 1 },
                    {},
                    user,
                    trxProvider,
                ),
            ).to.eventually.rejectedWith('UNIQUE constraint failed');
            const trx = await trxProvider();
            await trx.rollback();
            const app = await db(Tables.Routes).first().where({ route: '/upsert4' });
            expect(app).to.include({
                orderPos: 4,
                route: '/upsert4',
                next: 0,
                templateName: null,
                meta: null,
                domainId: null,
                namespace: 'ns1',
            });
        });
        it('should create a new route if ns is different', async () => {
            await db(Tables.Routes).insert({ route: '/upsert5', namespace: 'ns1', orderPos: 5 });

            const service = new RoutesRepository(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(
                { ...appRoute, route: '/upsert5', namespace: 'ns2', orderPos: 55 },
                {},
                user,
                trxProvider,
            );
            const trx = await trxProvider();
            await trx.commit();
            const [route1, route2] = await db(Tables.Routes).select().where({ route: '/upsert5' });
            expect(route1).to.deep.include({
                orderPos: 5,
                route: '/upsert5',
                next: 0,
                meta: null,
                domainId: null,
                namespace: 'ns1',
            });
            expect(route2).to.deep.include({
                orderPos: 55,
                route: '/upsert5',
                next: 0,
                meta: '{"a":1}',
                domainId: null,
                namespace: 'ns2',
            });
        });
    });
});
