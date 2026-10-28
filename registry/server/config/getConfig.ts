import { type RequestHandler } from 'express';
import type { Knex } from 'knex';

import type { RouteWithSlotRow } from '../appRoutes/interfaces';
import { routeWithSlotColumns } from '../appRoutes/repositories/RoutesRepository';
import { Tables } from '../db/structure';
import type { SettingsService } from '../settings/services/SettingsService';
import { appendDigest } from '../util/hmac';
import { EntityTypes } from '../versioning/interfaces';
import type { Versioning } from '../versioning/services/Versioning';
import { parseJSON } from '../util/json';
import { AppRouteDto, transformApps, transformRoutes, transformSharedLibs } from './transformConfig';

type ConfigReaderDependencies = {
    db: Knex;
    versioning: Versioning;
    settingsService: SettingsService;
};

export function getConfig({ db, versioning, settingsService }: ConfigReaderDependencies): RequestHandler {
    return async (req, res) => {
        let domainName = req.query.domainName ? req.query.domainName : undefined;
        domainName = typeof domainName === 'string' ? domainName : undefined;

        const [apps, templates, routes, sharedProps, settings, routerDomains, sharedLibs] = await Promise.all([
            versioning.versionedSelect(Tables.Apps, 'name', EntityTypes.apps, [`${Tables.Apps}.*`]),
            versioning.versionedSelect(Tables.Templates, 'name', EntityTypes.templates, [`${Tables.Templates}.name`]),
            versioning
                .versionedSelect<
                    typeof Tables.Routes,
                    RouteWithSlotRow
                >(Tables.Routes, 'id', EntityTypes.routes, routeWithSlotColumns)
                .leftJoin('route_slots', 'route_slots.routeId', 'routes.id')
                .orderBy('orderPos', 'ASC'),
            db.select().from('shared_props'), // No versionId for sharedProps in the response
            settingsService.getSettingsForConfig(domainName), // No versionId for settings in the response
            db.select().from(`${Tables.RouterDomains}`),
            versioning.versionedSelect(Tables.SharedLibs, 'name', EntityTypes.shared_libs, [`${Tables.SharedLibs}.*`]),
        ]);

        const data = {
            apps: {},
            templates: [] as string[],
            templatesVersions: [] as string[],
            routes: [] as AppRouteDto[],
            specialRoutes: [] as AppRouteDto[],
            settings: {},
            sharedLibs: {},
            dynamicLibs: {},
            canonicalDomain: undefined as string | undefined,
            domainProps: undefined as Record<string, unknown> | undefined,
            domainSsrProps: undefined as Record<string, unknown> | undefined,
        };

        data.apps = transformApps(apps, routerDomains, sharedProps, domainName);

        data.templates = templates.map(({ name }) => name);

        data.templatesVersions = templates.map(({ versionId }) => appendDigest(versionId, 'template'));

        const { routes: routeDtos, specialRoutes } = transformRoutes(routes, routerDomains);
        data.routes = routeDtos;
        data.specialRoutes = specialRoutes;

        data.settings = settings;

        const { sharedLibs: sharedLibsDtos, dynamicLibs } = transformSharedLibs(sharedLibs);

        data.sharedLibs = sharedLibsDtos;
        data.dynamicLibs = dynamicLibs;

        if (domainName) {
            const currentDomain = routerDomains.find((d) => d.domainName === domainName);
            if (currentDomain?.canonicalDomain) {
                data.canonicalDomain = currentDomain.canonicalDomain;
            }
            if (currentDomain?.props) {
                data.domainProps = parseJSON(currentDomain.props) as Record<string, unknown>;
            }
            if (currentDomain?.ssrProps) {
                data.domainSsrProps = parseJSON(currentDomain.ssrProps) as Record<string, unknown>;
            }
        }

        return res.send(data);
    };
}
