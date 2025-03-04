import express from 'express';

import { AppRoute, AppRouteSlot } from '../appRoutes/interfaces';
import knex from '../db';
import { Tables } from '../db/structure';
import settingsService from '../settings/services/SettingsService';
import { appendDigest } from '../util/hmac';
import { EntityTypes } from '../versioning/interfaces';
import { AppRouteDto, transformApps, transformRoutes, transformSharedLibs } from './transformConfig';

const router = express.Router();

router.get('/', async (req, res) => {
    let domainName = req.query.domainName ? req.query.domainName : undefined;
    domainName = typeof domainName === 'string' ? domainName : undefined;

    const [apps, templates, routes, sharedProps, settings, routerDomains, sharedLibs] = await Promise.all([
        knex.selectVersionedRowsFrom(Tables.Apps, 'name', EntityTypes.apps, [`${Tables.Apps}.*`]),
        knex.selectVersionedRowsFrom(Tables.Templates, 'name', EntityTypes.templates, [`${Tables.Templates}.name`]),
        knex
            .selectVersionedRowsFrom<AppRoute & AppRouteSlot>(Tables.Routes, 'id', EntityTypes.routes, [
                `${Tables.Routes}.*`,
                `${Tables.RouteSlots}.*`,
            ])
            .leftJoin('route_slots', 'route_slots.routeId', 'routes.id')
            .orderBy('orderPos', 'ASC'),
        knex.select().from('shared_props'), // No versionId for sharedProps in the response
        settingsService.getSettingsForConfig(domainName), // No versionId for settings in the response
        knex.select().from(`${Tables.RouterDomains}`),
        knex.selectVersionedRowsFrom(Tables.SharedLibs, 'name', EntityTypes.shared_libs, [`${Tables.SharedLibs}.*`]),
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
    };

    data.apps = transformApps(apps, routerDomains, sharedProps);

    data.templates = templates.map(({ name }) => name);

    data.templatesVersions = templates.map(({ versionId }) => appendDigest(versionId, 'template'));

    const { routes: routeDtos, specialRoutes } = transformRoutes(routes, routerDomains);
    data.routes = routeDtos;
    data.specialRoutes = specialRoutes;

    data.settings = settings;

    const { sharedLibs: sharedLibsDtos, dynamicLibs } = transformSharedLibs(sharedLibs);

    data.sharedLibs = sharedLibsDtos;
    data.dynamicLibs = dynamicLibs;

    return res.send(data);
});

export default router;
