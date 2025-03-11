import path from 'path';
import _ from 'lodash';

import { expect, dbFactory } from './common';
import { VersionedKnex } from '../server/db';
import { Versioning } from '../server/versioning/services/Versioning';
import versioningConfig from '../server/versioning/config';
import { User } from '../typings/User';

const testUser: User = Object.freeze({
    identifier: 'testUser',
    authEntityId: 1,
    role: 'testUser',
});

describe('Versioning Unit', () => {
    let db: VersionedKnex;
    let reset: () => Promise<void>;
    let versionService: Versioning;
    before(async function () {
        this.timeout(10 * 1000);

        ({ db, reset } = dbFactory());
        versionService = new Versioning(versioningConfig);
        versionService.setDb(db);

        await db.migrate.latest({
            directory: path.join(__dirname, '../server/migrations'),
        });
    });
    after(async () => {
        await reset();
    });

    beforeEach(async function () {
        this.timeout(10 * 1000);

        await db.seed.run({
            directory: path.join(__dirname, '../server/seeds'),
        });
    });

    describe('logOperation', () => {
        it('Should log entity creation w/o relations & predefined ID', async () => {
            const entityId = 'test_id';
            const entityType = 'shared_props';

            const changeId = await db.versioning(testUser, { type: entityType, id: entityId }, async (trx) => {
                await db(entityType)
                    .insert({
                        name: entityId,
                        props: JSON.stringify({ a: 1 }),
                    })
                    .transacting(trx);
            });

            const changeData = await db('versioning').first().where('id', changeId);
            expect(changeData.entity_type).to.equal(entityType);
            expect(changeData.entity_id).to.equal(entityId);
            expect(changeData.data).to.be.null;
            expect(changeData.data_after).to.equal('{"data":{"props":"{\\"a\\":1}","ssrProps":null},"related":{}}');
            expect(changeData.created_by).to.equal(testUser.identifier);
        });

        it('Should log entity creation w/o relations & auto increment ID', async () => {
            const entityType = 'auth_entities';
            const entityData = {
                identifier: 'test',
                secret: null,
                provider: 'local',
                role: 'admin',
                meta: null,
            };

            const changeId = await db.versioning(testUser, { type: entityType }, async (trx) => {
                const [id] = await db(entityType).insert(entityData).transacting(trx);
                return id;
            });

            const changeData = await db('versioning').first().where('id', changeId);
            expect(changeData.entity_type).to.equal(entityType);
            expect(changeData.data).to.be.null;
            expect(changeData.data_after).to.equal(JSON.stringify({ data: entityData, related: {} }));
            expect(changeData.created_by).to.equal(testUser.identifier);
        });

        it('Should log entity creation with relations & auto increment ID', async () => {
            const entityType = 'routes';
            const entityRelationType = 'route_slots';
            const entityData = {
                orderPos: 999,
                route: '/tst',
                next: false,
                templateName: null,
                meta: JSON.stringify({ first: 'value' }),
                domainId: null,
            };
            const entityRelationData = {
                name: 'tst',
                appName: '@portal/navbar',
                props: JSON.stringify({ tst: 1 }),
                kind: 'primary',
            };

            const changeId = await db.versioning(testUser, { type: entityType }, async (trx) => {
                const [id] = await db(entityType).insert(entityData).transacting(trx);
                await db(entityRelationType)
                    .insert(Object.assign({ routeId: id }, entityRelationData))
                    .transacting(trx);

                return id;
            });

            const changeData = await db('versioning').first().where('id', changeId);
            expect(changeData.entity_type).to.equal(entityType);
            expect(changeData.data).to.be.null;
            expect(changeData.data_after).to.equal(
                JSON.stringify({
                    data: { ...entityData, next: 0, namespace: null }, // SQLite does not support boolean
                    related: { [entityRelationType]: [entityRelationData] },
                }),
            );
            expect(changeData.created_by).to.equal(testUser.identifier);
        });

        it('Should log entity modification', async () => {
            const entityId = '@portal/navbar';
            const entityType = 'apps';
            const changeSet = { kind: 'primary' as const };

            const changeId = await db.versioning(testUser, { type: entityType, id: entityId }, async (trx) => {
                await db(entityType).where({ name: entityId }).update(changeSet).transacting(trx);
            });

            const changeData = await db('versioning').first().where('id', changeId);
            expect(changeData.entity_type).to.equal(entityType);
            expect(changeData.entity_id).to.equal(entityId);
            expect(JSON.parse(changeData.data_after)).to.deep.eq(
                _.merge(JSON.parse(changeData.data), { data: changeSet }),
            );
            expect(changeData.created_by).to.equal(testUser.identifier);
        });

        it('Should NOT log entity modification which does not have actual changes', async () => {
            const entityId = '@portal/navbar';
            const entityType = 'apps';
            const changeSetWithTheSameExistedData = { kind: 'essential' as const };

            const changeId = await db.versioning(testUser, { type: entityType, id: entityId }, async (trx) => {
                await db(entityType).where({ name: entityId }).update(changeSetWithTheSameExistedData).transacting(trx);
            });

            expect(changeId).to.be.null;
        });

        it('Should log entity deletion', async () => {
            const entityId = '@portal/fetchWithCache';
            const entityType = 'apps';

            const entityData = await db(entityType).where({ name: entityId }).first();

            const changeId = await db.versioning(testUser, { type: entityType, id: entityId }, async (trx) => {
                await db(entityType).where({ name: entityId }).delete().transacting(trx);
            });

            const changeData = await db('versioning').first().where('id', changeId);
            expect(changeData.entity_type).to.equal(entityType);
            expect(changeData.entity_id).to.equal(entityId);
            expect(JSON.parse(changeData.data)).to.deep.eq({
                data: _.omit(entityData, ['name']),
                related: {},
            });
            expect(changeData.data_after).to.be.null;
            expect(changeData.created_by).to.equal(testUser.identifier);
        });

        it('should work with external transaction (commit)', async () => {
            const entityId = '@portal/navbar';
            const entityType = 'apps';
            const changeSet = { kind: 'regular' as const };

            const trxProvider = db.transactionProvider();
            const changeId = await db.versioning(
                testUser,
                { type: entityType, id: entityId, trxProvider },
                async (trx) => {
                    await db(entityType).where({ name: entityId }).update(changeSet).transacting(trx);
                },
            );
            const trx = await trxProvider();
            await trx.commit();

            const changeData = await db('versioning').first().where('id', changeId);
            expect(changeData.entity_type).to.equal(entityType);
            expect(changeData.entity_id).to.equal(entityId);
            expect(JSON.parse(changeData.data_after)).to.deep.eq(
                _.merge(JSON.parse(changeData.data), { data: changeSet }),
            );
            expect(changeData.created_by).to.equal(testUser.identifier);
        });
        it('should work with external transaction (rollback)', async () => {
            const entityId = '@portal/navbar';
            const entityType = 'apps';
            const changeSet = { kind: 'primary' as const };

            const trxProvider = db.transactionProvider();
            await db.versioning(testUser, { type: entityType, id: entityId, trxProvider }, async (trx) => {
                await db(entityType).where({ name: entityId }).update(changeSet).transacting(trx);
            });
            const trx = await trxProvider();
            await trx.rollback();
            const [row] = await db(entityType).select('*').where({ name: entityId });
            expect(row.kind).equal('essential'); // default value
        });
        it('should work with external transaction (rollback throw)', async () => {
            const entityId = '@portal/navbar';
            const entityType = 'apps';
            const changeSet = { kind: 'invalid' as any };

            const trxProvider = db.transactionProvider();
            await expect(
                db.versioning(testUser, { type: entityType, id: entityId, trxProvider }, async (trx) => {
                    await db(entityType).where({ name: entityId }).update(changeSet).transacting(trx);
                }),
            ).eventually.rejectedWith('SQLITE_CONSTRAINT: CHECK constraint failed: kind');
            await (await trxProvider()).rollback();
        });
    });

    describe('revertOperation', () => {
        it('Should revert entity creation', async () => {
            const entityId = 'test_id';
            const entityType = 'shared_props';

            const changeId = await db.versioning(testUser, { type: entityType, id: entityId }, async (trx) => {
                await db(entityType)
                    .insert({
                        name: entityId,
                        props: JSON.stringify({ a: 1 }),
                    })
                    .transacting(trx);
            });

            const revertChangeId = await versionService.revertOperation(testUser, changeId);

            const entityRow = await db(entityType).first().where('name', entityId);
            expect(entityRow).to.be.undefined;

            const changeData = await db('versioning').first().where('id', changeId);
            const revertData = await db('versioning').first().where('id', revertChangeId);
            expect(revertData.entity_type).to.equal(entityType);
            expect(revertData.entity_id).to.equal(entityId);
            expect(revertData.data).to.equal(changeData.data_after);
            expect(revertData.data_after).to.be.null;
            expect(revertData.created_by).to.equal(testUser.identifier);
        });

        it('Should revert entity modification', async () => {
            const entityId = '@portal/navbar';
            const entityType = 'apps';
            const changeSet = { kind: 'primary' as const };

            const entityRowBefore = await db(entityType).first().where('name', entityId);

            const changeId = await db.versioning(testUser, { type: entityType, id: entityId }, async (trx) => {
                await db(entityType).where({ name: entityId }).update(changeSet).transacting(trx);
            });

            const revertChangeId = await versionService.revertOperation(testUser, changeId);

            const entityRowAfter = await db(entityType).first().where('name', entityId);
            expect(entityRowBefore).to.be.eql(entityRowAfter);

            const changeData = await db('versioning').first().where('id', changeId);
            const revertData = await db('versioning').first().where('id', revertChangeId);
            expect(revertData.entity_type).to.equal(entityType);
            expect(revertData.entity_id).to.equal(entityId);
            expect(revertData.data).to.equal(changeData.data_after);
            expect(revertData.data_after).to.equal(changeData.data);
            expect(revertData.created_by).to.equal(testUser.identifier);
        });

        it('Should revert entity deletion', async () => {
            const entityId = '@portal/fetchWithCache';
            const entityType = 'apps';

            const entityRowBefore = await db(entityType).where({ name: entityId }).first();

            const changeId = await db.versioning(testUser, { type: entityType, id: entityId }, async (trx) => {
                await db(entityType).where({ name: entityId }).delete().transacting(trx);
            });

            expect(await db(entityType).first().where('name', entityId)).to.be.undefined;

            const revertChangeId = await versionService.revertOperation(testUser, changeId);

            const entityRowAfter = await db(entityType).first().where('name', entityId);
            expect(entityRowBefore).to.be.eql(entityRowAfter);

            const changeData = await db('versioning').first().where('id', changeId);
            const revertData = await db('versioning').first().where('id', revertChangeId);
            expect(revertData.entity_type).to.equal(entityType);
            expect(revertData.entity_id).to.equal(entityId);
            expect(revertData.data).to.be.null;
            expect(revertData.data_after).to.equal(changeData.data);
            expect(revertData.created_by).to.equal(testUser.identifier);
        });
    });
});
