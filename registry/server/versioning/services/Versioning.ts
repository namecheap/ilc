import versioningConfig from '../config';
import Knex, {Transaction} from 'knex';
import {User} from "../../auth";
import _ from 'lodash';
import * as errors from '../errors';
import db from "../../db";

export interface OperationConf {
    type: string;
    id?: string|number;
}

export class Versioning {
    private db?: Knex;

    constructor(
        private config: typeof versioningConfig,
    ) {}

    public setDb(db: Knex) {
        this.db = db;
    }

    /**
     * @param user
     * @param conf
     * @param callback
     * @returns - Id of the version record
     */
    public logOperation = async (user: Express.User|User, conf: OperationConf, callback: (transaction: Transaction) => Promise<void|number>) => {
        if (this.config[conf.type] === undefined) {
            throw new Error(`Attempt to log changes to unknown entity: "${conf.type}"`);
        }
        if (!this.db) {
            throw new Error(`Attempt to log operation before DB initialization!`);
        }

        return await this.db.transaction(async (trx: Transaction) => {
            let currentData = null;
            if (conf.id) {
                currentData = await this.getDataSnapshot(trx, conf);
            }

            const newRecordId = await callback(trx);
            if (conf.id === undefined && newRecordId === undefined) {
                throw new Error(`Unable to identify record ID. Received ids: "${conf.id}" & "${newRecordId}"`);
            } else if (conf.id === undefined) {
                conf.id = newRecordId as number;
            }
            const newData = await this.getDataSnapshot(trx, conf);

            const logRecord = {
                entity_type: conf.type,
                entity_id: conf.id,
                data: JSON.stringify(currentData),
                data_after: JSON.stringify(newData),
                created_by: (user as User).identifier,
                created_at: Math.floor(new Date().getTime() / 1000),
            };

            const [versionID] = await this.db!('versioning').insert(logRecord).transacting(trx);
            return versionID;
        });
    }

    public async revertOperation(user: Express.User, versionId: number) {
        let versionRow = await db('versioning').first('*').where('id', versionId);
        if (!versionRow) {
            throw new errors.NonExistingVersionError();
        }
        versionRow = this.parseVersionData(versionRow);

        await this.checkRevertability(versionRow);

        const entityConf = this.config[versionRow.entity_type];

        return await this.logOperation(user, {type: versionRow.entity_type, id: versionRow.entity_id}, async (trx) => {
            if (versionRow.data === null) { // We have creation operation, so we delete records to revert it
                for (const relation of entityConf.related) {
                    await this.db!(relation.type).where(relation.key, versionRow.entity_id).delete().transacting(trx);
                }
                await this.db!(versionRow.entity_type).where(entityConf.idColumn, versionRow.entity_id).delete().transacting(trx);
            } else if (versionRow.data_after === null) { // Deletion operation, so we need to create everything the was deleted
                const dataToRestore = versionRow.data;
                await this.db!(versionRow.entity_type).insert({...dataToRestore.data, [entityConf.idColumn]: versionRow.entity_id}).transacting(trx);

                for (const relation of entityConf.related) {
                    const relatedItems = dataToRestore.related[relation.type].map((v: any) => ({...v, [relation.key]: versionRow.entity_id}));
                    await this.db!.batchInsert(relation.type, relatedItems).transacting(trx);
                }
            } else { // We have an update operation
                const dataToRestore = versionRow.data;
                for (const relation of entityConf.related) {
                    await this.db!(relation.type).where(relation.key, versionRow.entity_id).delete().transacting(trx);

                    const relatedItems = dataToRestore.related[relation.type].map((v: any) => ({...v, [relation.key]: versionRow.entity_id}));
                    await this.db!.batchInsert(relation.type, relatedItems).transacting(trx);
                }
                await this.db!(versionRow.entity_type).where(entityConf.idColumn, versionRow.entity_id).update(dataToRestore.data).transacting(trx);
            }
        });
    }

    private async getDataSnapshot(trx: Transaction, conf: OperationConf) {
        if (!this.db) {
            throw new Error(`Attempt to log operation before DB initialization!`);
        }
        if (!conf.id) {
            throw new Error(`Attempt to log operation without passing an ID! Passed ID: "${conf.id}"`);
        }

        const entityConf = this.config[conf.type];

        const dbRes = await this.db(conf.type)
            .first('*')
            .where(entityConf.idColumn, conf.id)
            .transacting(trx);

        if (!dbRes) {
            return null;
        }


        const res = {
            data: _.omit(dbRes, [entityConf.idColumn]),
            related: {} as Record<string, any>,
        }

        for (const relation of entityConf.related) {
            const dbRes = await this.db(relation.type)
                .select('*')
                .where(relation.key, conf.id)
                .transacting(trx);

            res.related[relation.type] = dbRes.map(v => _.omit(v, [relation.key, relation.idColumn]));
        }

        return res;
    }

    private async checkRevertability(versionRow: any) {
        if (!this.db) {
            throw new Error(`Attempt to perform operation before DB initialization!`);
        }

        let lastVersionRow = await this.db('versioning')
            .first('*')
            .where(_.pick(versionRow, ['entity_type', 'entity_id']))
            .orderBy('id', 'desc');
        lastVersionRow = this.parseVersionData(lastVersionRow);

        if (lastVersionRow.id === versionRow.id) {
            return;
        }

        if (versionRow.data_after === null) { // Deletion operation
            throw new errors.NonRevertableError({d: {reason: "It's possible to revert deletion operations only if it's the last one for selected entity"}});
        } else if (lastVersionRow.data_after === null) { // We have creation/update operation & last is the delete one
            throw new errors.NonRevertableError({d: {reason: "It's possible to revert creation/update operations only if the last one is not a deletion one"}});
        }
    }

    private parseVersionData(versionRow: any) {
        versionRow.data = versionRow.data === null ? null : JSON.parse(versionRow.data);
        versionRow.data_after = versionRow.data_after === null ? null : JSON.parse(versionRow.data_after);

        return versionRow;
    }

}

export default new Versioning(versioningConfig);
