import type { Knex } from 'knex';
import { AuthEntitiesRepository } from './authEntities/repositories/AuthEntitiesRepository';
import { AuthEntitiesService } from './authEntities/services/AuthEntitiesService';
import { RouterDomainsRepository } from './routerDomains/repositories/RouterDomainsRepository';
import { RouterDomainsService } from './routerDomains/services/RouterDomainsService';
import settingsService from './settings/services/SettingsService';
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

    return {
        versioning,
        sharedProps: new SharedPropsService(new SharedPropsRepository(versioning), versioning),
        routerDomains: new RouterDomainsService(routerDomainsRepository, versioning),
        authEntities: new AuthEntitiesService(new AuthEntitiesRepository(versioning), versioning),
        templates: new TemplatesService(
            new TemplatesRepository(db, versioning),
            routerDomainsRepository,
            versioning,
            settingsService,
        ),
    };
}

export type Services = ReturnType<typeof createServices>;
