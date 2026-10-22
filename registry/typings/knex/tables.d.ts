import { type Knex } from 'knex';
import { AppRoute, AppRouteSlot } from '../../server/appRoutes/interfaces';
import { App } from '../../server/apps/interfaces';
import { DomainSetting, SettingRaw } from '../../server/settings/interfaces';
import { SharedLib } from '../../server/sharedLibs/interfaces';
import { LocalizedTemplateRow, TemplateRow } from '../../server/templates/interfaces';
import { AuthEntityRow } from '../../server/authEntities/interfaces';
import { SharedPropsRow } from '../../server/sharedProps/interfaces';
import RouterDomains from '../../server/routerDomains/interfaces';

type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

declare module 'knex/types/tables' {
    interface Tables {
        apps: Knex.CompositeTableType<App>;
        routes: Knex.CompositeTableType<AppRoute, Optional<AppRoute, 'id'>>;
        route_slots: Knex.CompositeTableType<AppRouteSlot, Optional<AppRouteSlot, 'id'>>;
        shared_libs: Knex.CompositeTableType<SharedLib>;
        settings: Knex.CompositeTableType<SettingRaw>;
        settings_domain_value: Knex.CompositeTableType<DomainSetting, Optional<DomainSetting, 'id'>>;
        router_domains: Knex.CompositeTableType<RouterDomains, Optional<RouterDomains, 'id'>>;
        shared_props: Knex.CompositeTableType<
            SharedPropsRow,
            Optional<SharedPropsRow, 'ssrProps'>,
            Partial<Omit<SharedPropsRow, 'name'>>
        >;
        templates: Knex.CompositeTableType<TemplateRow>;
        templates_localized: Knex.CompositeTableType<LocalizedTemplateRow>;
        auth_entities: Knex.CompositeTableType<
            AuthEntityRow,
            Optional<AuthEntityRow, 'id' | 'secret' | 'provider' | 'role' | 'meta'>,
            Partial<Omit<AuthEntityRow, 'id'>>
        >;
    }
}
