import type Knex from 'knex';
import type {Transaction} from 'knex';

import versioningService, {OperationConf} from '../versioning/services/Versioning';

interface VersionedKnex extends Knex {
    versioning(user: any, conf: OperationConf, callback: (transaction: Transaction) => Promise<void|number>): void;
}

export default function (knex: Knex|any): VersionedKnex {
    if (knex.versioning) {
        return knex;
    }

    versioningService.setDb(knex);
    knex.versioning = versioningService.logOperation;

    return knex;
}
