import type { Knex } from 'knex';
import { ConfigService } from './config/ConfigService';
import { AppsRepository } from './apps/repositories/AppsRepository';
import { AppsService } from './apps/services/AppsService';
import { RoutesRepository } from './appRoutes/repositories/RoutesRepository';
import { RoutesService } from './appRoutes/services/RoutesService';
import { SharedLibsRepository } from './sharedLibs/repositories/SharedLibsRepository';
import { SharedLibsService } from './sharedLibs/services/SharedLibsService';
import { AuthEntitiesRepository } from './authEntities/repositories/AuthEntitiesRepository';
import { AuthEntitiesService } from './authEntities/services/AuthEntitiesService';
import { RouterDomainsRepository } from './routerDomains/repositories/RouterDomainsRepository';
import { RouterDomainsService } from './routerDomains/services/RouterDomainsService';
import { SettingsRepository } from './settings/repositories/SettingsRepository';
import { SettingsService } from './settings/services/SettingsService';
import { TemplatesRepository } from './templates/repositories/TemplatesRepository';
import { TemplatesService } from './templates/services/TemplatesService';
import { SharedPropsRepository } from './sharedProps/repositories/SharedPropsRepository';
import { SharedPropsService } from './sharedProps/services/SharedPropsService';
import versioningConfig from './versioning/config';
import { Versioning } from './versioning/services/Versioning';

/** Builds the services once per app, entities move here from module singletons as they are refactored */
export function createServices(db: Knex) {
    const versioning = new Versioning(versioningConfig, db);
    const routerDomainsRepository = new RouterDomainsRepository(db, versioning);
    const settings = new SettingsService(new SettingsRepository(db), routerDomainsRepository, versioning);
    const routerDomains = new RouterDomainsService(routerDomainsRepository, versioning);
    const sharedLibs = new SharedLibsService(new SharedLibsRepository(db, versioning), versioning);
    const apps = new AppsService(new AppsRepository(db, versioning), routerDomains, versioning);
    const routes = new RoutesService(new RoutesRepository(db, versioning), routerDomains, versioning);

    return {
        versioning,
        sharedProps: new SharedPropsService(new SharedPropsRepository(versioning), versioning),
        routerDomains,
        authEntities: new AuthEntitiesService(new AuthEntitiesRepository(versioning), versioning),
        templates: new TemplatesService(
            new TemplatesRepository(db, versioning),
            routerDomainsRepository,
            versioning,
            settings,
        ),
        sharedLibs,
        routes,
        apps,
        settings,
        config: new ConfigService(db, apps, sharedLibs, routes),
    };
}

export type Services = ReturnType<typeof createServices>;
