import versioningConfig from '../config';
import Knex, {Transaction} from 'knex';
import {User} from "../../auth";
import _ from "lodash";

export interface OperationConf {
    type: string;
    id: string|number;
}

export class Versioning {
    private db?: Knex;

    constructor(
        private config: typeof versioningConfig,
    ) {}

    public setDb(db: Knex) {
        this.db = db;
    }

    public logOperation = async (user: User, conf: OperationConf, callback: (transaction: Transaction) => Promise<void>) => {
        if (this.config[conf.type] === undefined) {
            throw new Error(`Attempt to log changes to unknown entity: "${conf.type}"`);
        }
        if (!this.db) {
            throw new Error(`Attempt to log operation before DB initialization!`);
        }

        await this.db.transaction(async (trx: Transaction) => {
            const currentData = await this.getDataSnapshot(trx, conf);
            const res = await callback(trx);
            const newData = await this.getDataSnapshot(trx, conf);

            const logRecord = {
                entity_type: conf.type,
                entity_id: conf.id,
                data: JSON.stringify(currentData),
                data_after: JSON.stringify(newData),
                created_by: user.identifier,
                created_at: Math.floor(new Date().getTime() / 1000),
            };

            await this.db!('versioning').insert(logRecord).transacting(trx);

            return res;
        });
    }

    private async getDataSnapshot(trx: Transaction, conf: OperationConf) {
        if (!this.db) {
            throw new Error(`Attempt to log operation before DB initialization!`);
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

            res.related = dbRes.reduce((acc, v) => {
                acc[relation.type] = _.omit(v, [relation.key, relation.idColumn]);
                return acc;
            }, {})
        }

        return res;
    }

}

export default new Versioning(versioningConfig);
