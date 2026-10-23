import type { VersionedKnex } from './db';
import { ConfigService } from './config/ConfigService';
import { SharedLibsRepository } from './sharedLibs/repositories/SharedLibsRepository';
import { SharedLibsService } from './sharedLibs/services/SharedLibsService';
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
export function createServices(db: VersionedKnex) {
    const versioning = new Versioning(versioningConfig, db);
    const routerDomainsRepository = new RouterDomainsRepository(db, versioning);
    const sharedLibs = new SharedLibsService(new SharedLibsRepository(versioning), versioning);

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
        sharedLibs,
        // Still takes the patched Knex for apps and routes, which haven't moved yet
        config: new ConfigService(db, sharedLibs),
    };
}

export type Services = ReturnType<typeof createServices>;
