import _ from 'lodash';
import express from 'express';

import knex from '../db';
import { transformSpecialRoutesForConsumer } from '../appRoutes/services/transformSpecialRoutes';
import settingsService from '../settings/services/SettingsService';
import { parseJSON } from '../common/services/json';
import { tables } from '../db/structure';
import { appendDigest } from '../util/hmac';

const router = express.Router();

router.get('/', async (req, res) => {
    console.log('config');

    let domainName = req.query.domainName ? req.query.domainName : undefined;
    domainName = typeof domainName === 'string' ? domainName : undefined;
    const versionId = 'versionId';

    const appsLibsEntityId = knex.ref(`${tables.apps}.name`);
    const appsVersionIdSubQuery = knex
        .table(tables.versioning)
        .max('id').as(versionId)
        .where('entity_id', appsLibsEntityId)
        .andWhere('entity_type', 'apps');

    const templatesLibsEntityId = knex.ref(`${tables.templates}.name`);
    const templatesVersionIdSubQuery = knex
        .table(tables.versioning)
        .max('id').as(versionId)
        .where('entity_id', templatesLibsEntityId)
        .andWhere('entity_type', 'templates');

    const routesVersionIdSubQuery = knex
        .table(tables.versioning)
        .max('id').as(versionId)
        .where('entity_id', knex.raw('cast(routes.id as char)'))
        .andWhere('entity_type', 'routes');

    const sharedLibsEntityId = knex.ref(`${tables.sharedLibs}.name`);
    const sharedLibsVersionIdSubQuery = knex
        .table(tables.versioning)
        .max('id').as(versionId)
        .where('entity_id', sharedLibsEntityId)
        .andWhere('entity_type', 'shared_libs');

    const [apps, templates, routes, sharedProps, settings, routerDomains, sharedLibs] = await Promise.all([
        knex.select(`${tables.apps}.*`, appsVersionIdSubQuery).from(tables.apps),
        knex.select(`${tables.templates}.name`, templatesVersionIdSubQuery).from(tables.templates),
        knex
            .select(`${tables.routes}.*`, `${tables.routeSlots}.*`, routesVersionIdSubQuery)
            .orderBy('orderPos', 'ASC')
            .from('routes')
            .leftJoin('route_slots', 'route_slots.routeId', 'routes.id'),
        knex.select().from('shared_props'), // No versionId for sharedProps in the response
        settingsService.getSettingsForConfig(domainName), // No versionId for settings in the response
        knex.select().from(`${tables.routerDomains}`),
        knex.select(`${tables.sharedLibs}.*`, sharedLibsVersionIdSubQuery).from(`${tables.sharedLibs}`),
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

    data.apps = apps.reduce((acc, v) => {
        v.versionId = appendDigest(v.versionId, 'app');
        v.ssr = parseJSON(v.ssr);
        v.dependencies = parseJSON(v.dependencies);
        v.props = parseJSON(v.props);
        v.ssrProps = parseJSON(v.ssrProps);

        if (sharedProps.length && v.configSelector !== null) {
            parseJSON<string[]>(v.configSelector).forEach((configSelectorName) => {
                const commonConfig = sharedProps.find((n) => n.name === configSelectorName);
                if (commonConfig) {
                    v.props = _.merge({}, parseJSON(commonConfig.props), v.props);
                    v.ssrProps = _.merge({}, parseJSON(commonConfig.ssrProps), v.ssrProps);
                }
            });
        }
        v.enforceDomain =
            v.enforceDomain && (routerDomains.find(({ id }) => id === v.enforceDomain)?.domainName || null);

        v = _.omitBy(v, (v) => v === null || (typeof v === 'object' && Object.keys(v).length === 0));

        acc[v.name] = _.pick(v, [
            'kind',
            'ssr',
            'dependencies',
            'props',
            'ssrProps',
            'spaBundle',
            'cssBundle',
            'wrappedWith',
            'enforceDomain',
            'l10nManifest',
            'versionId',
        ]);

        return acc;
    }, {});

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
                    _.pick(routeItem, ['routeId', 'route', 'next', 'template', 'specialRole', 'domain', 'versionId']),
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
