import type { Knex } from 'knex';

import versioningService, { OperationConf } from '../versioning/services/Versioning';

export interface VersionedKnex extends Knex {
    versioning(
        user: any,
        conf: OperationConf,
        callback: (transaction: Knex.Transaction) => Promise<void | number>,
    ): Promise<number>;
}

export default function (knex: Knex | any): VersionedKnex {
    if (knex.versioning) {
        return knex;
    }

    versioningService.setDb(knex);
    knex.versioning = versioningService.logOperation;

    return knex;
}
