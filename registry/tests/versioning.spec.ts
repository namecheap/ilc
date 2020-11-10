import path from 'path';
import { expect, dbFactory } from './common';
import {VersionedKnex} from "../server/db";

const testUser = Object.freeze({
    identifier: 'testUser',
});


describe('Versioning', () => {
    let db: VersionedKnex;
    before(async () => {
        db = dbFactory();
        await db.migrate.latest({directory: path.join(__dirname, '../server/migrations')});
    });

    beforeEach(async () => {
        await db.seed.run({directory: path.join(__dirname, '../server/seeds')});
    })

    describe('Unit tests', () => {
        it('Should log entity creation w/o relations & predefined ID', async () => {
            const entityId = 'test_id';
            const entityType = 'shared_props';

            const changeId = await db.versioning(testUser, {type: entityType, id: entityId}, async (trx) => {
                await db(entityType).insert({name: entityId, props: JSON.stringify({a: 1})}).transacting(trx);
            });

            const changeData = await db('versioning').first().where('id', changeId);
            expect(changeData.entity_type).to.equal(entityType);
            expect(changeData.entity_id).to.equal(entityId);
            expect(changeData.data).to.be.null;
            expect(changeData.data_after).to.equal('{"data":{"props":"{\\"a\\":1}"},"related":{}}');
            expect(changeData.created_by).to.equal(testUser.identifier);
        });

        it('Should log entity creation w/o relations & auto increment ID', async () => {
            const entityType = 'auth_entities';
            const entityData = {identifier: 'test', secret: null, provider: 'local', role: 'admin', meta: null};

            const changeId = await db.versioning(testUser, {type: entityType}, async (trx) => {
                const [id] = await db(entityType).insert(entityData).transacting(trx);
                return id;
            });

            const changeData = await db('versioning').first().where('id', changeId);
            expect(changeData.entity_type).to.equal(entityType);
            expect(changeData.data).to.be.null;
            expect(changeData.data_after).to.equal(JSON.stringify({data: entityData, related: {}}));
            expect(changeData.created_by).to.equal(testUser.identifier);
        });

        it('Should log entity creation with relations & auto increment ID', async () => {
            const entityType = 'routes';
            const entityRelationType = 'route_slots';
            const entityData = {specialRole: null, orderPos: 999, route: '/tst', next: 0, templateName: null};
            const entityRelationData = {
                name: 'tst',
                appName: '@portal/navbar',
                props: JSON.stringify({tst: 1}),
                kind: 'primary',
            };

            const changeId = await db.versioning(testUser, {type: entityType}, async (trx) => {
                const [id] = await db(entityType).insert(entityData).transacting(trx);
                await db(entityRelationType).insert(Object.assign({routeId: id}, entityRelationData)).transacting(trx);

                return id;
            });

            const changeData = await db('versioning').first().where('id', changeId);
            expect(changeData.entity_type).to.equal(entityType);
            expect(changeData.data).to.be.null;
            expect(changeData.data_after).to.equal(JSON.stringify({
                data: entityData,
                related: { [entityRelationType]: [entityRelationData] }
            }));
            expect(changeData.created_by).to.equal(testUser.identifier);
        });
    });
});
