import { type Knex } from 'knex';
import { App } from '../../server/apps/interfaces';
import { AppRoute, AppRouteSlot } from '../../server/appRoutes/interfaces';

declare module 'knex/types/tables' {
    interface Tables {
        apps: Knex.CompositeTableType<App>;
        routes: Knex.CompositeTableType<AppRoute>;
        route_slots: Knex.CompositeTableType<AppRouteSlot>;
        // TODO add remaining tables
    }
}
