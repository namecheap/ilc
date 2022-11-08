// knex.d.ts

import { Knex } from 'knex';

declare module 'knex' {
    namespace Knex {
        interface QueryBuilder {
            // See file db.ts for implementation
            range<TRecord, TResult>(value: string | null | undefined): QueryBuilder<TRecord, TResult>;
        }
    }
}
