import versioningConfig from '../config';
import Knex, {Transaction} from 'knex';
import {User} from "../../auth";
import _ from "lodash";

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
    public logOperation = async (user: User, conf: OperationConf, callback: (transaction: Transaction) => Promise<void|number>) => {
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
                created_by: user.identifier,
                created_at: Math.floor(new Date().getTime() / 1000),
            };

            const [versionID] = await this.db!('versioning').insert(logRecord).transacting(trx);
            return versionID;
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

}

export default new Versioning(versioningConfig);
