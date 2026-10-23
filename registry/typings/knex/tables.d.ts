import { type Knex } from 'knex';
import { RouteRow, RouteSlotRow } from '../../server/appRoutes/interfaces';
import { AppRow } from '../../server/apps/interfaces';
import { DomainSettingRow, SettingRow } from '../../server/settings/interfaces';
import { SharedLibRow } from '../../server/sharedLibs/interfaces';
import { LocalizedTemplateRow, TemplateRow } from '../../server/templates/interfaces';
import { AuthEntityRow } from '../../server/authEntities/interfaces';
import { SharedPropsRow } from '../../server/sharedProps/interfaces';
import { RouterDomainsRow } from '../../server/routerDomains/interfaces';
import { VersionRow, VersionRowData } from '../../server/versioning/interfaces';

type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

declare module 'knex/types/tables' {
    interface Tables {
        versioning: Knex.CompositeTableType<VersionRow, VersionRowData>;
        apps: Knex.CompositeTableType<
            AppRow,
            Optional<AppRow, Exclude<keyof AppRow, 'name'>>,
            Partial<Omit<AppRow, 'name'>>
        >;
        // domainIdIdxble is generated from domainId
        routes: Knex.CompositeTableType<
            RouteRow,
            Optional<
                Omit<RouteRow, 'domainIdIdxble'>,
                'id' | 'orderPos' | 'next' | 'templateName' | 'meta' | 'domainId' | 'namespace'
            >,
            Partial<Omit<RouteRow, 'id' | 'domainIdIdxble'>>
        >;
        route_slots: Knex.CompositeTableType<
            RouteSlotRow,
            Optional<RouteSlotRow, 'id' | 'props' | 'kind'>,
            Partial<Omit<RouteSlotRow, 'id'>>
        >;
        shared_libs: Knex.CompositeTableType<
            SharedLibRow,
            Optional<SharedLibRow, 'assetsDiscoveryUrl' | 'assetsDiscoveryUpdatedAt' | 'adminNotes' | 'l10nManifest'>,
            Partial<Omit<SharedLibRow, 'name'>>
        >;
        // The migrations that add settings pass meta as JSON text, which a json column accepts as well
        settings: Knex.CompositeTableType<
            SettingRow,
            Omit<SettingRow, 'meta'> & { meta: SettingRow['meta'] | string },
            Partial<Omit<SettingRow, 'meta'> & { meta: SettingRow['meta'] | string }>
        >;
        settings_domain_value: Knex.CompositeTableType<DomainSettingRow, Optional<DomainSettingRow, 'id'>>;
        router_domains: Knex.CompositeTableType<
            RouterDomainsRow,
            Optional<RouterDomainsRow, 'id' | 'canonicalDomain' | 'alias' | 'props' | 'ssrProps'>,
            Partial<Omit<RouterDomainsRow, 'id'>>
        >;
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
