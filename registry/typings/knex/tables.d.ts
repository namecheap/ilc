import { type Knex } from 'knex';
import { App } from '../../server/apps/interfaces';

declare module 'knex/types/tables' {
    interface Tables {
        apps: Knex.CompositeTableType<App>;
        // TODO add remaining tables
    }
}
