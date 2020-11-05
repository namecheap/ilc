import type Knex from 'knex';
import type {Transaction} from 'knex';
import {User} from '../auth';
import _ from 'lodash';
import entitiesConf from './versioningConfig';

export interface OperationConf {
    type: string;
    id: string|number;
}

interface VersionedKnex extends Knex {
    versioning(user: any, conf: OperationConf, callback: (transaction: Transaction) => Promise<void>): void;
}

export default function (knex: Knex|any): VersionedKnex {
    if (knex.versioning) {
        return knex;
    }

    knex.versioning = async function (user: User, conf: OperationConf, callback: (transaction: Transaction) => Promise<void>) {
        if (entitiesConf[conf.type] === undefined) {
            throw new Error(`Attempt to log changes to unknown entity: "${conf.type}"`)
        }

        await knex.transaction(async (trx: Transaction) => {
            const currentData = await getDataSnapshot(knex, trx, conf);
            const res = await callback(trx);
            const newData = await getDataSnapshot(knex, trx, conf);

            const logRecord = {
                entity_type: conf.type,
                entity_id: conf.id,
                data: JSON.stringify(currentData),
                data_after: JSON.stringify(newData),
                created_by: user.identifier,
                created_at: Math.floor(new Date().getTime() / 1000),
            };

            await knex('versioning').insert(logRecord).transacting(trx);

            return res;
        });
    }

    return knex;
}

async function getDataSnapshot(db: Knex, trx: Transaction, conf: OperationConf) {
    const entityConf = entitiesConf[conf.type];

    const dbRes = await db(conf.type)
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
        const dbRes = await db(relation.type)
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
