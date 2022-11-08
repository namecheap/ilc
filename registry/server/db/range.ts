import type Knex from 'knex';

export default function (knex: typeof Knex) {
    knex.QueryBuilder.extend('range', function (this: any, range: string | null | undefined) {
        if (typeof range !== 'string') {
            return this.client.transaction(async (trx: any) => {
                const res = await this.transacting(trx);
                return { data: res, pagination: { total: res.length } };
            });
        }

        const input = JSON.parse(range);

        const countQuery = new this.constructor(this.client)
            .count('* as total')
            .from(this.clone().offset(0).as('__count__query__'))
            .first();

        // This will paginate the data itself
        this.offset(parseInt(input[0])).limit(parseInt(input[1]) - parseInt(input[0]) + 1);

        return this.client.transaction(async (trx: any) => {
            const res = await this.transacting(trx);
            const { total } = await countQuery.transacting(trx);
            return { data: res, pagination: { total } };
        });
    });
}
