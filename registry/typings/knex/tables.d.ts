import { type Knex } from 'knex';
import { AppRoute, AppRouteSlot } from '../../server/appRoutes/interfaces';
import { App } from '../../server/apps/interfaces';
import { SharedLib } from '../../server/sharedLibs/interfaces';

declare module 'knex/types/tables' {
    interface Tables {
        apps: Knex.CompositeTableType<App>;
        routes: Knex.CompositeTableType<AppRoute>;
        route_slots: Knex.CompositeTableType<AppRouteSlot>;
        shared_libs: Knex.CompositeTableType<SharedLib>;
        // TODO add remaining tables
    }
}
