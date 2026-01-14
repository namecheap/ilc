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

    describe('secret sanitization', () => {
        it('should mask secret setting values in versioning records', async () => {
            const entityType = 'settings';
            const settingKey = 'test.secret.setting';

            const changeId = await db.versioning(testUser, { type: entityType, id: settingKey }, async (trx) => {
                await db(entityType)
                    .insert({
                        key: settingKey as any,
                        value: 'super-secret-value',
                        default: 'default-secret-value',
                        scope: 'registry' as any,
                        secret: true,
                        meta: null,
                    } as any)
                    .transacting(trx);
            });

            const changeData = await db('versioning').first().where('id', changeId);
            const dataAfter = JSON.parse(changeData.data_after);

            expect(dataAfter.data.value).to.equal('[SECRET]');
            expect(dataAfter.data.default).to.equal('[SECRET]');

            expect(dataAfter.data.scope).to.equal('registry');
            expect(dataAfter.data.secret).to.equal(1);

            await db(entityType).where('key', settingKey).delete();
        });

        it('should NOT mask non-secret setting values', async () => {
            const entityType = 'settings';
            const settingKey = 'test.public.setting';

            const changeId = await db.versioning(testUser, { type: entityType, id: settingKey }, async (trx) => {
                await db(entityType)
                    .insert({
                        key: settingKey as any,
                        value: 'public-value',
                        default: 'default-public-value',
                        scope: 'registry' as any,
                        secret: false,
                        meta: null,
                    } as any)
                    .transacting(trx);
            });

            const changeData = await db('versioning').first().where('id', changeId);
            const dataAfter = JSON.parse(changeData.data_after);

            expect(dataAfter.data.value).to.equal('public-value');
            expect(dataAfter.data.default).to.equal('default-public-value');

            await db(entityType).where('key', settingKey).delete();
        });

        it('should mask auth_entities secret field in versioning records', async () => {
            const entityType = 'auth_entities';
            const entityData = {
                identifier: 'test-auth-entity',
                secret: 'hashed-password-or-token',
                provider: 'local',
                role: 'admin',
                meta: null,
            };

            const changeId = await db.versioning(testUser, { type: entityType }, async (trx) => {
                const [id] = await db(entityType).insert(entityData).transacting(trx);
                return id;
            });

            const changeData = await db('versioning').first().where('id', changeId);
            const dataAfter = JSON.parse(changeData.data_after);

            expect(dataAfter.data.secret).to.equal('[SECRET]');

            expect(dataAfter.data.identifier).to.equal('test-auth-entity');
            expect(dataAfter.data.provider).to.equal('local');
            expect(dataAfter.data.role).to.equal('admin');

            await db(entityType).where({ identifier: 'test-auth-entity' }).delete();
        });

        it('should NOT mask auth_entities without secret value', async () => {
            const entityType = 'auth_entities';
            const entityData = {
                identifier: 'test-auth-entity-no-secret',
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
            const dataAfter = JSON.parse(changeData.data_after);

            expect(dataAfter.data.secret).to.be.null;

            await db(entityType).where({ identifier: 'test-auth-entity-no-secret' }).delete();
        });

        it('should detect actual secret changes even when stored masked', async () => {
            const entityType = 'settings';
            const settingKey = 'test.secret.change.detection';

            await db.versioning(testUser, { type: entityType, id: settingKey }, async (trx) => {
                await db(entityType)
                    .insert({
                        key: settingKey as any,
                        value: 'initial-secret',
                        default: '',
                        scope: 'registry' as any,
                        secret: true,
                        meta: null,
                    } as any)
                    .transacting(trx);
            });

            const updateChangeId = await db.versioning(testUser, { type: entityType, id: settingKey }, async (trx) => {
                await db(entityType).where('key', settingKey).update({ value: 'new-secret' }).transacting(trx);
            });

            expect(updateChangeId).to.not.be.null;

            const changeData = await db('versioning').first().where('id', updateChangeId);
            const data = JSON.parse(changeData.data);
            const dataAfter = JSON.parse(changeData.data_after);

            expect(data.data.value).to.equal('[SECRET]');
            expect(dataAfter.data.value).to.equal('[SECRET]');

            await db(entityType).where('key', settingKey).delete();
        });

        it('should NOT log change when only updating with same secret value', async () => {
            const entityType = 'settings';
            const settingKey = 'test.secret.no.change';

            await db.versioning(testUser, { type: entityType, id: settingKey }, async (trx) => {
                await db(entityType)
                    .insert({
                        key: settingKey as any,
                        value: 'same-secret',
                        default: '',
                        scope: 'registry' as any,
                        secret: true,
                        meta: null,
                    } as any)
                    .transacting(trx);
            });

            const updateChangeId = await db.versioning(testUser, { type: entityType, id: settingKey }, async (trx) => {
                await db(entityType).where('key', settingKey).update({ value: 'same-secret' }).transacting(trx);
            });

            expect(updateChangeId).to.be.null;

            await db(entityType).where('key', settingKey).delete();
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

        it('Should revert non-secret fields on secret setting while preserving current secret', async () => {
            const entityType = 'settings';
            const settingKey = 'test.revert.secret.setting';

            await db.versioning(testUser, { type: entityType, id: settingKey }, async (trx) => {
                await db(entityType)
                    .insert({
                        key: settingKey as any,
                        value: 'initial-secret',
                        default: '',
                        scope: 'registry' as any,
                        secret: true,
                        meta: null,
                    } as any)
                    .transacting(trx);
            });

            const updateChangeId = await db.versioning(testUser, { type: entityType, id: settingKey }, async (trx) => {
                await db(entityType)
                    .where('key', settingKey)
                    .update({ value: 'new-secret', scope: 'ilc' as any })
                    .transacting(trx);
            });

            const afterUpdate = await db(entityType).first().where('key', settingKey);
            expect(afterUpdate!.scope).to.equal('ilc');
            expect(afterUpdate!.value).to.equal('new-secret');

            await versionService.revertOperation(testUser, updateChangeId!);

            const afterRevert = await db(entityType).first().where('key', settingKey);
            expect(afterRevert!.scope).to.equal('registry');
            expect(afterRevert!.value).to.equal('new-secret');

            await db(entityType).where('key', settingKey).delete();
        });

        it('Should revert auth_entity modification while preserving current secret', async () => {
            const entityType = 'auth_entities';

            const createChangeId = await db.versioning(testUser, { type: entityType }, async (trx) => {
                const [inserted] = await db(entityType)
                    .insert({
                        identifier: 'test-revert-auth',
                        secret: 'initial-hashed-secret',
                        provider: 'local',
                        role: 'admin',
                    })
                    .returning('id')
                    .transacting(trx);
                return typeof inserted === 'object' ? inserted.id : inserted;
            });

            const created = await db(entityType).first().where('identifier', 'test-revert-auth');
            const entityId = created.id;

            const updateChangeId = await db.versioning(testUser, { type: entityType, id: entityId }, async (trx) => {
                await db(entityType)
                    .where({ id: entityId })
                    .update({ role: 'readonly', secret: 'new-hashed-secret' })
                    .transacting(trx);
            });

            const afterUpdate = await db(entityType).first().where('id', entityId);
            expect(afterUpdate.role).to.equal('readonly');
            expect(afterUpdate.secret).to.equal('new-hashed-secret');

            await versionService.revertOperation(testUser, updateChangeId!);

            const afterRevert = await db(entityType).first().where('id', entityId);
            expect(afterRevert.role).to.equal('admin');
            expect(afterRevert.secret).to.equal('new-hashed-secret');

            await db(entityType).where({ id: entityId }).delete();
        });
    });
});
