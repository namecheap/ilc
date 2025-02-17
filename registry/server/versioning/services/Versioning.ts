import { Knex } from 'knex';
import { User } from '../../../typings/User';
import versioningConfig from '../config';

import { extractInsertedId, formatDate } from '../../util/db';
import * as errors from '../errors';
import { EntityTypes, OperationConfig, VersionRow, VersionRowData, VersionRowParsed } from '../interfaces';
import Transaction = Knex.Transaction;

export * from '../interfaces';

export class Versioning {
    private _db?: Knex;

    constructor(private config: typeof versioningConfig) {}

    public setDb(db: Knex) {
        this._db = db;
    }

    private get db(): Knex {
        if (!this._db) {
            throw new Error(`Attempt to perform operation before DB initialization!`);
        }
        return this._db;
    }

    /**
     * @param user
     * @param config
     * @param callback
     * @returns - Id of the version record
     */
    public logOperation = async (
        user: User | undefined,
        config: OperationConfig,
        callback: (transaction: Transaction) => Promise<void | number>,
    ): Promise<number | null> => {
        if (this.config[config.type] === undefined) {
            throw new Error(`Attempt to log changes to unknown entity: "${config.type}"`);
        }
        if (!this.db) {
            throw new Error(`Attempt to log operation before DB initialization!`);
        }

        const trxProvider = config.trxProvider ?? this.db.transactionProvider();
        const trx = await trxProvider();
        const isExternalTrx = !!config.trxProvider;
        const commit = isExternalTrx ? async () => {} : () => trx.commit();
        const rollback = isExternalTrx ? async () => {} : () => trx.rollback();
        try {
            const currentData = config.id ? await this.getDataSnapshot(trx, config) : null;

            const newRecordId = await callback(trx);

            const resourceId = config.id ?? newRecordId;
            if (resourceId === undefined) {
                throw new Error(`Unable to identify record ID. Received ids: "${config.id}" & "${newRecordId}"`);
            }
            const updatedConfig = { ...config, id: resourceId };
            const newData = await this.getDataSnapshot(trx, updatedConfig);

            if (newData === null && currentData === null) {
                throw new errors.VersioningError({
                    m: `Unable to determine changeset for entity type "${updatedConfig.type}" & ID "${updatedConfig.id}"`,
                });
            }

            const data = currentData === null ? null : JSON.stringify(currentData);
            const data_after = newData === null ? null : JSON.stringify(newData);

            if (data === data_after) {
                await commit();
                return null;
            }

            const logRecord: VersionRowData = {
                entity_type: updatedConfig.type,
                entity_id: updatedConfig.id.toString(),
                data,
                data_after,
                created_by: user ? user.identifier : 'unauthenticated',
                created_at: formatDate(new Date()),
            };

            const insertedId = await this.db('versioning').returning('id').insert(logRecord).transacting(trx);

            await commit();
            return extractInsertedId(insertedId);
        } catch (error) {
            await rollback();
            throw error;
        }
    };

    public async revertOperation(user: User | undefined, versionId: number) {
        const versionRowRaw = await this.db('versioning').first('*').where('id', versionId);
        if (!versionRowRaw) {
            throw new errors.NonExistingVersionError();
        }
        const versionRow = this.parseVersionData(versionRowRaw);

        await this.checkRevertability(versionRow);

        const entityConfig = this.config[versionRow.entity_type as EntityTypes];
        if (entityConfig === undefined) {
            throw new Error(`Attempt to revert operation for unknown entity type: "${versionRow.entity_type}"`);
        }

        return await this.logOperation(
            user,
            {
                type: versionRow.entity_type as EntityTypes,
                id: versionRow.entity_id,
            },
            async (trx) => {
                if (versionRow.data === null) {
                    // We have creation operation, so we delete records to revert it
                    for (const relation of entityConfig.related) {
                        await this.db(relation.type)
                            .where(relation.key, versionRow.entity_id)
                            .delete()
                            .transacting(trx);
                    }
                    await this.db(versionRow.entity_type)
                        .where(entityConfig.idColumn, versionRow.entity_id)
                        .delete()
                        .transacting(trx);
                } else if (versionRow.data_after === null) {
                    // Deletion operation, so we need to create everything the was deleted
                    const dataToRestore = versionRow.data;
                    await this.db(versionRow.entity_type)
                        .insert({
                            ...dataToRestore.data,
                            [entityConfig.idColumn]: versionRow.entity_id,
                        })
                        .transacting(trx);

                    for (const relation of entityConfig.related) {
                        const relatedItems = dataToRestore.related[relation.type].map((v: any) => ({
                            ...v,
                            [relation.key]: versionRow.entity_id,
                        }));
                        await this.db.batchInsert(relation.type, relatedItems).transacting(trx);
                    }
                } else {
                    // We have an update operation
                    const dataToRestore = versionRow.data;
                    for (const relation of entityConfig.related) {
                        await this.db(relation.type)
                            .where(relation.key, versionRow.entity_id)
                            .delete()
                            .transacting(trx);

                        const relatedItems = dataToRestore.related[relation.type].map((v: any) => ({
                            ...v,
                            [relation.key]: versionRow.entity_id,
                        }));
                        await this.db.batchInsert(relation.type, relatedItems).transacting(trx);
                    }
                    await this.db(versionRow.entity_type)
                        .where(entityConfig.idColumn, versionRow.entity_id)
                        .update(dataToRestore.data)
                        .transacting(trx);
                }
            },
        );
    }

    private async getDataSnapshot(trx: Transaction, config: OperationConfig) {
        if (!config.id) {
            throw new Error(`Attempt to log operation without passing an ID! Passed ID: "${config.id}"`);
        }

        const entityConfig = this.config[config.type];

        const entity = await this.db(config.type).first('*').where(entityConfig.idColumn, config.id).transacting(trx);

        if (!entity) {
            return null;
        }

        const { [entityConfig.idColumn]: id, ...rest } = entity;
        const entityWithRelations = {
            data: entityConfig.omitColumns
                ? Object.fromEntries(Object.entries(rest).filter(([key]) => !entityConfig.omitColumns?.includes(key)))
                : rest,
            related: {} as Record<string, any>,
        };

        for (const relation of entityConfig.related) {
            const relatedEntity = await this.db(relation.type)
                .select('*')
                .where(relation.key, config.id)
                .transacting(trx);

            entityWithRelations.related[relation.type] = relatedEntity.map((v) => {
                const { [relation.key]: relationKey, [relation.idColumn]: idColumn, ...rest } = v;
                return rest;
            });
        }

        return entityWithRelations;
    }

    private async checkRevertability(versionRow: VersionRowParsed) {
        const lastVersionRow = this.parseVersionData(
            await this.db('versioning')
                .first('*')
                .where({
                    entity_type: versionRow.entity_type,
                    entity_id: versionRow.entity_id,
                })
                .orderBy('id', 'desc'),
        );

        if (lastVersionRow.id === versionRow.id) {
            return;
        }

        if (versionRow.data_after === null) {
            // Deletion operation
            throw new errors.NonRevertableError({
                d: {
                    reason: "It's possible to revert deletion operations only if it's the last one for selected entity",
                },
            });
        } else if (lastVersionRow.data_after === null) {
            // We have creation/update operation & last is the delete one
            throw new errors.NonRevertableError({
                d: {
                    reason: "It's possible to revert creation/update operations only if the last one is not a deletion one",
                },
            });
        }
    }

    private parseVersionData(versionRow: VersionRow): VersionRowParsed {
        return {
            ...versionRow,
            data: versionRow.data === null ? null : JSON.parse(versionRow.data),
            data_after: versionRow.data_after === null ? null : JSON.parse(versionRow.data_after),
        };
    }
}

export default new Versioning(versioningConfig);
