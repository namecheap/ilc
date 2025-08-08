import { type Knex } from 'knex';
import { AppRoute, AppRouteSlot } from '../../server/appRoutes/interfaces';
import { App } from '../../server/apps/interfaces';
import { SharedLib } from '../../server/sharedLibs/interfaces';
import { DomainSetting } from '../../server/settings/interfaces';

type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

declare module 'knex/types/tables' {
    interface Tables {
        apps: Knex.CompositeTableType<App>;
        routes: Knex.CompositeTableType<AppRoute, Optional<AppRoute, 'id'>>;
        route_slots: Knex.CompositeTableType<AppRouteSlot, Optional<AppRouteSlot, 'id'>>;
        shared_libs: Knex.CompositeTableType<SharedLib>;
        settings_domain_value: Knex.CompositeTableType<DomainSetting, Optional<DomainSetting, 'id'>>;
        // TODO add remaining tables
    }
}
