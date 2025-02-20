import { type Knex } from 'knex';
import { User } from '../../../../typings/User';

export type CommonOptions = {
    user?: User;
    trxProvider?: Knex.TransactionProvider;
};

export interface Entry<T = unknown> {
    patch(entity: unknown, options: CommonOptions): Promise<T>;
    create(entity: unknown, options: CommonOptions): Promise<T>;
    upsert(entity: unknown, options: CommonOptions): Promise<T>;
}
