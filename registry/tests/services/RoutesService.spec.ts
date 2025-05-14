import path from 'path';
import sinon from 'sinon';
import { RoutesService } from '../../server/appRoutes/routes/RoutesService';
import { VersionedKnex } from '../../server/db';
import { Tables } from '../../server/db/structure';
import { User } from '../../typings/User';
import { dbFactory, expect } from '../common';

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
    slots: {
        slot1: {
            appName: '@portal/upsert',
            props: { a: 1 },
            kind: 'regular' as const,
        },
    },
};

describe('RoutesService', () => {
    let db: VersionedKnex;
    let versioning: sinon.SinonSpy;
    let reset: () => Promise<void>;
    before(async () => {
        ({ db, reset } = dbFactory());
        await db.migrate.latest({
            directory: path.join(__dirname, '../../server/migrations'),
        });
        await db(Tables.Apps).insert({ name: '@portal/upsert', kind: 'primary' });
        await db(Tables.Templates).insert([
            { name: 'master', content: 'content' },
            { name: 'masteradmin', content: 'content' },
        ]);
        await db(Tables.RouterDomains).insert({ id: 1, domainName: 'example.com', template500: 'master' });
        versioning = sinon.spy(db, 'versioning');
    });
    beforeEach(() => {
        versioning.resetHistory();
    });
    after(async () => {
        versioning.restore();
        await reset();
    });
    describe('upsert', () => {
        it('should create item', async () => {
            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(appRoute, user, trxProvider);
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
            const slots = await db(Tables.RouteSlots).select().where({ routeId: route?.id });
            expect(slots).to.have.length(1);
            expect(slots[0]).to.deep.include({
                routeId: route?.id,
                appName: '@portal/upsert',
                name: 'slot1',
                props: '{"a":1}',
                kind: 'regular',
            });
            sinon.assert.calledWithMatch(
                versioning,
                sinon.match.any,
                sinon.match({
                    id: undefined,
                    type: 'routes',
                }),
            );
        });
        it('should update item', async () => {
            await db(Tables.Routes).insert({
                route: '/upsert2',
                namespace: 'ns1',
                orderPos: 2,
            });
            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(
                { ...appRoute, route: '/upsert2', namespace: 'ns1', orderPos: 2, next: true },
                user,
                trxProvider,
            );
            const trx = await trxProvider();
            await trx.commit();
            const route = await db(Tables.Routes).first().where({ orderPos: 2 });
            expect(route).to.deep.include({
                orderPos: 2,
                route: '/upsert2',
                next: 1,
                meta: '{"a":1}',
                domainId: null,
            });
            const slots = await db(Tables.RouteSlots).select().where({ routeId: route?.id });
            expect(slots).to.have.length(1);
            expect(slots[0]).to.deep.include({
                routeId: route?.id,
                appName: '@portal/upsert',
                name: 'slot1',
                props: '{"a":1}',
                kind: 'regular',
            });
            sinon.assert.calledWithMatch(
                versioning,
                sinon.match.any,
                sinon.match({
                    id: 2,
                    type: 'routes',
                }),
            );
        });
        it('should set default value if not specified', async () => {
            await db(Tables.Routes).insert({
                route: '/upsert6',
                namespace: 'ns1',
                orderPos: 6,
                next: true,
                templateName: 'masteradmin',
                meta: '{"a":1}',
                domainId: 1,
            });
            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(
                { route: '/upsert6_1', namespace: 'ns1', domainId: 1, orderPos: 6 },
                user,
                trxProvider,
            );
            const trx = await trxProvider();
            await trx.commit();
            const route = await db(Tables.Routes).first().where({ route: '/upsert6_1' });
            expect(route).to.deep.include({
                orderPos: 6,
                route: '/upsert6_1',
                next: 0,
                templateName: null,
                domainId: 1,
                meta: '{}',
            });
        });
        it('should cancel upsert', async () => {
            await db(Tables.Routes).insert({ route: '/upsert3', namespace: 'ns1', orderPos: 3 });
            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(
                {
                    ...appRoute,
                    route: '/upsert33',
                    namespace: 'ns1',
                    orderPos: 3,
                    slots: {
                        upsert3: {
                            appName: '@portal/upsert',
                            props: { ncTestProp: 1 },
                            kind: 'regular' as const,
                        },
                    },
                },
                user,
                trxProvider,
            );
            const trx = await trxProvider();
            await trx.rollback();
            const route = await db(Tables.Routes).first().where({ route: '/upsert3' });
            expect(route).to.include({
                orderPos: 3,
                route: '/upsert3',
                next: 0,
                templateName: null,
                meta: null,
                domainId: null,
                namespace: 'ns1',
            });
            const slots = await db(Tables.RouteSlots).select().where({ routeId: route?.id });
            expect(slots).to.have.length(0);
        });
        it('should throw on constraint fail', async () => {
            await db(Tables.Routes).insert({ route: '/upsert4', namespace: 'ns1', orderPos: 4 });
            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await expect(
                service.upsert({ ...appRoute, route: '/upsert4', namespace: 'ns1', orderPos: 1 }, user, trxProvider),
            ).to.eventually.rejectedWith('UNIQUE constraint failed');
            const trx = await trxProvider();
            await trx.rollback();
            const route = await db(Tables.Routes).first().where({ route: '/upsert4' });
            expect(route).to.include({
                orderPos: 4,
                route: '/upsert4',
                next: 0,
                templateName: null,
                meta: null,
                domainId: null,
                namespace: 'ns1',
            });
            const slots = await db(Tables.RouteSlots).select().where({ routeId: route?.id });
            expect(slots).to.have.length(0);
        });
        it('should throw on validation error', async () => {
            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await expect(
                service.upsert(
                    { ...appRoute, route: '/upsert7', orderPos: 'x' as any, slots: { slot3: appRoute.slots.slot1 } },
                    user,
                    trxProvider,
                ),
            ).to.eventually.rejectedWith('"orderPos" must be a number');
            const trx = await trxProvider();
            await trx.rollback();
            const route = await db(Tables.Routes).first().where({ route: '/upsert7' });
            expect(route).to.be.undefined;
            const slots = await db(Tables.RouteSlots).select().where({ name: 'slot3' });
            expect(slots).to.have.length(0);
        });
        it('should throw on validation error', async () => {
            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await expect(
                service.upsert(
                    { ...appRoute, route: '/upsert8', orderPos: 1, slots: { slot3: appRoute.slots.slot1 } },
                    user,
                    trxProvider,
                ),
            ).to.eventually.rejectedWith('UNIQUE constraint failed');
            const trx = await trxProvider();
            await trx.rollback();
            const route = await db(Tables.Routes).first().where({ route: '/upsert8' });
            expect(route).to.be.undefined;
        });
        it('should create a new route if ns is different', async () => {
            const [route] = await db(Tables.Routes)
                .insert({ route: '/upsert5', namespace: 'ns1', orderPos: 5 })
                .returning('*');
            await db(Tables.RouteSlots).insert({
                routeId: route.id!,
                name: 'slot0',
                appName: '@portal/upsert',
                props: '{"a":1}',
                kind: 'regular',
            });

            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await service.upsert({ ...appRoute, route: '/upsert5', namespace: 'ns2', orderPos: 55 }, user, trxProvider);
            const trx = await trxProvider();
            await trx.commit();
            const [route0, route1] = await db(Tables.Routes).select().where({ route: '/upsert5' }).orderBy('id', 'asc');
            expect(route0).to.deep.include({
                orderPos: 5,
                route: '/upsert5',
                next: 0,
                meta: null,
                domainId: null,
                namespace: 'ns1',
            });
            expect(route1).to.deep.include({
                orderPos: 55,
                route: '/upsert5',
                next: 0,
                meta: '{"a":1}',
                domainId: null,
                namespace: 'ns2',
            });
            const [slot0, slot1] = await db(Tables.RouteSlots)
                .select()
                .where('routeId', 'in', [route0.id, route1.id])
                .orderBy('routeId', 'asc');
            expect(slot1).to.deep.include({
                routeId: route1?.id,
                appName: '@portal/upsert',
                name: 'slot1',
                props: '{"a":1}',
                kind: 'regular',
            });
            expect(slot0).to.deep.include({
                routeId: route0?.id,
                appName: '@portal/upsert',
                name: 'slot0',
                props: '{"a":1}',
                kind: 'regular',
            });
        });
        it('should create a new route if domainId is different', async () => {
            const [route] = await db(Tables.Routes)
                .insert({ route: '/upsert8', namespace: 'ns1', orderPos: 8 })
                .returning('*');
            await db(Tables.RouteSlots).insert({
                routeId: route.id!,
                name: 'slot0',
                appName: '@portal/upsert',
                props: '{"a":1}',
                kind: 'regular',
            });
            await db(Tables.RouterDomains).insert({ id: 2, domainName: 'localhost', template500: 'master' });

            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await service.upsert(
                { ...appRoute, route: '/upsert8', namespace: 'ns1', orderPos: 8, domainId: 2 },
                user,
                trxProvider,
            );
            const trx = await trxProvider();
            await trx.commit();
            const [route0, route1] = await db(Tables.Routes).select().where({ route: '/upsert8' }).orderBy('id', 'asc');
            expect(route0).to.deep.include({
                orderPos: 8,
                route: '/upsert8',
                next: 0,
                meta: null,
                domainId: null,
                namespace: 'ns1',
            });
            expect(route1).to.deep.include({
                orderPos: 8,
                route: '/upsert8',
                next: 0,
                meta: '{"a":1}',
                domainId: 2,
                namespace: 'ns1',
            });
            const [slot0, slot1] = await db(Tables.RouteSlots)
                .select()
                .where('routeId', 'in', [route0.id, route1.id])
                .orderBy('routeId', 'asc');
            expect(slot1).to.deep.include({
                routeId: route1?.id,
                appName: '@portal/upsert',
                name: 'slot1',
                props: '{"a":1}',
                kind: 'regular',
            });
            expect(slot0).to.deep.include({
                routeId: route0?.id,
                appName: '@portal/upsert',
                name: 'slot0',
                props: '{"a":1}',
                kind: 'regular',
            });
        });
        it('should delete by namespace', async () => {
            await db(Tables.Routes).insert([
                { id: 20, route: '/upsert9', namespace: 'ns1', orderPos: 9 },
                { id: 21, route: '/upsert10', namespace: 'ns1', orderPos: 10 },
                { id: 22, route: '/upsert11', namespace: 'ns2', orderPos: 11 },
            ]);
            await db(Tables.RouteSlots).insert([
                { routeId: 20, name: 'slot0', appName: '@portal/upsert', props: '{"a":1}', kind: 'regular' },
                { routeId: 21, name: 'slot1', appName: '@portal/upsert', props: '{"a":1}', kind: 'regular' },
                { routeId: 22, name: 'slot2', appName: '@portal/upsert', props: '{"a":1}', kind: 'regular' },
            ]);
            const service = new RoutesService(db);
            const trxProvider = db.transactionProvider();
            await service.deleteByNamespace('ns1', [2], { user, trxProvider });
            const trx = await trxProvider();
            await trx.commit();
            const route1 = await db(Tables.Routes).first().where({ route: '/upsert9' });
            expect(route1).to.be.undefined;
            const route2 = await db(Tables.Routes).first().where({ route: '/upsert10' });
            expect(route2).to.be.undefined;
            const route3 = await db(Tables.Routes).first().where({ route: '/upsert11' });
            expect(route3).to.deep.include({
                route: '/upsert11',
            });
            const slots = await db(Tables.RouteSlots).select().where({ routeId: 22 });
            expect(slots).to.have.length(1);
            expect(slots[0]).to.deep.include({
                routeId: 22,
                appName: '@portal/upsert',
                name: 'slot2',
            });
        });
    });
});
