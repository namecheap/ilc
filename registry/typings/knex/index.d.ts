// knex.d.ts

import * as Knex from 'knex';

declare module 'knex' {
    interface QueryBuilder {
        // See file db.ts for implementation
        range<TRecord, TResult>(value: string|null|undefined): QueryBuilder<TRecord, TResult>;
    }
}
