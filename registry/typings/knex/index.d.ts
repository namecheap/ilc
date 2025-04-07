// knex.d.ts
import 'knex';

interface RangeResult<T> {
    data: T;
    pagination: {
        total: number;
    };
}

declare module 'knex' {
    namespace Knex {
        interface QueryBuilder<TRecord extends {} = any, TResult = any> {
            // See file db.ts for implementation
            range(value: string | null | undefined): QueryBuilder<TRecord, RangeResult<TResult>>;
            syncSequence(column?: string, step?: number, defaultValue?: number): QueryBuilder<TRecord, number>;
            cascadeTruncate(): QueryBuilder<TRecord, void>;
        }
    }
}
