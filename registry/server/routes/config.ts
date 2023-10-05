import _ from 'lodash';
import express from 'express';

import knex from '../db';
import { transformSpecialRoutesForConsumer } from '../appRoutes/services/transformSpecialRoutes';
import settingsService from '../settings/services/SettingsService';
import { parseJSON } from '../common/services/json';

const router = express.Router();

router.get('/', async (req, res) => {
    let domainName = req.query.domainName ? req.query.domainName : undefined;
    domainName = typeof domainName === 'string' ? domainName : undefined;

    const [apps, templates, routes, sharedProps, settings, routerDomains, sharedLibs] = await Promise.all([
        knex.select().from('apps'),
        knex.select('name').from('templates'),
        knex
            .select()
            .orderBy('orderPos', 'ASC')
            .from('routes')
            .leftJoin('route_slots', 'route_slots.routeId', 'routes.id'),
        knex.select().from('shared_props'),
        settingsService.getSettingsForConfig(domainName),
        knex.select().from('router_domains'),
        knex.select().from('shared_libs'),
    ]);

    const data = {
        apps: {},
        templates: [] as string[],
        routes: [] as any[],
        specialRoutes: [] as any[],
        settings: {},
        sharedLibs: {},
        dynamicLibs: {},
    };

    data.apps = apps.reduce((acc, v) => {
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
        ]);

        return acc;
    }, {});

    data.templates = templates.map(({ name }) => name);

    routes.forEach((routeItem) => {
        routeItem = transformSpecialRoutesForConsumer(routeItem);

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
                    _.pick(routeItem, ['routeId', 'route', 'next', 'template', 'specialRole', 'domain']),
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

    data.dynamicLibs = sharedLibs.reduce((acc, { name, spaBundle, l10nManifest }) => {
        acc[name] = { spaBundle, l10nManifest };
        return acc;
    }, {});

    return res.send(data);
});

export default router;
