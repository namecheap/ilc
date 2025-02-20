import express from 'express';
import _ from 'lodash';

import { transformSpecialRoutesForConsumer } from '../appRoutes/services/transformSpecialRoutes';
import { parseJSON } from '../common/services/json';
import knex from '../db';
import { Tables } from '../db/structure';
import settingsService from '../settings/services/SettingsService';
import { appendDigest } from '../util/hmac';
import { EntityTypes } from '../versioning/interfaces';
import { transformApps } from './transformConfig';

const router = express.Router();

router.get('/', async (req, res) => {
    let domainName = req.query.domainName ? req.query.domainName : undefined;
    domainName = typeof domainName === 'string' ? domainName : undefined;

    const [apps, templates, routes, sharedProps, settings, routerDomains, sharedLibs] = await Promise.all([
        knex.selectVersionedRowsFrom(Tables.Apps, 'name', EntityTypes.apps, [`${Tables.Apps}.*`]),
        knex.selectVersionedRowsFrom(Tables.Templates, 'name', EntityTypes.templates, [`${Tables.Templates}.name`]),
        knex
            .selectVersionedRowsFrom(Tables.Routes, 'id', EntityTypes.routes, [
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
        routes: [] as any[],
        specialRoutes: [] as any[],
        settings: {},
        sharedLibs: {},
        dynamicLibs: {},
    };

    data.apps = transformApps(apps, routerDomains, sharedProps);

    data.templates = templates.map(({ name }) => name);

    data.templatesVersions = templates.map(({ versionId }) => appendDigest(versionId, 'template'));

    routes.forEach((routeItem) => {
        const routeVersionId = appendDigest(routeItem.versionId, 'route');

        routeItem = transformSpecialRoutesForConsumer(routeItem);

        routeItem.versionId = routeVersionId;

        const currentRoutesList = routeItem.specialRole ? data.specialRoutes : data.routes;

        let routeData = currentRoutesList.find(({ routeId }) => routeId === routeItem.routeId);

        if (routeData === undefined) {
            routeItem.next = !!routeItem.next;
            routeItem.template = routeItem.templateName;

            routeItem.domain =
                routeItem.domainId === null
                    ? null
                    : routerDomains.find(({ id }) => id === routeItem.domainId)?.domainName || null;
            delete routeItem.domainId;

            routeData = Object.assign(
                {
                    slots: {},
                    meta: {},
                },
                _.omitBy(
                    _.pick(routeItem, [
                        'routeId',
                        'route',
                        'next',
                        'template',
                        'specialRole',
                        'domain',
                        'orderPos',
                        'versionId',
                    ]),
                    _.isNull,
                ),
            );

            currentRoutesList.push(routeData);
        }

        if (routeItem.name !== null) {
            routeData.slots[routeItem.name] = {
                appName: routeItem.appName,
                props: routeItem.props !== null ? parseJSON(routeItem.props) : {},
                kind: routeItem.kind,
            };
        }

        if (routeItem.meta !== null) {
            routeData.meta = parseJSON(routeItem.meta);
        }
    });

    data.settings = settings;

    data.sharedLibs = sharedLibs.reduce((acc, { name, spaBundle }) => {
        acc[name] = spaBundle;
        return acc;
    }, {});

    data.dynamicLibs = sharedLibs.reduce((acc, { name, spaBundle, l10nManifest, versionId }) => {
        acc[name] = { spaBundle, l10nManifest, versionId: appendDigest(versionId, 'sharedLib') };
        return acc;
    }, {});

    return res.send(data);
});

export default router;
