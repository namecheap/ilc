import _ from 'lodash';
import express from 'express';

import knex from '../db';
import {Setting, Scope} from '../settings/interfaces';
import preProcessResponse from '../settings/services/preProcessResponse';
import { transformSpecialRoutesForConsumer } from '../appRoutes/services/transformSpecialRoutes';
import { configResolverMiddleware } from '../middleware'
const router = express.Router();

router.get('/', async (req, res, next) => {
    const [apps, templates, routes, sharedProps, settings, routerDomains, sharedLibs] = await Promise.all([
        knex.select().from('apps'),
        knex.select('name').from('templates'),
        knex.select()
            .orderBy('orderPos', 'ASC')
            .from('routes')
            .join('route_slots', 'route_slots.routeId', 'routes.id'),
        knex.select().from('shared_props'),
        knex.select().from('settings').where('scope', Scope.Ilc),
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
    };

    data.apps = apps.reduce((acc, v) => {
        v.ssr = JSON.parse(v.ssr);
        v.dependencies = JSON.parse(v.dependencies);
        v.props = JSON.parse(v.props);
        v.ssrProps = JSON.parse(v.ssrProps);
        if (sharedProps.length && v.configSelector !== null) {
            JSON.parse(v.configSelector).forEach((configSelectorName: string) => {
                const commonConfig = sharedProps.find(n => n.name === configSelectorName);
                if (commonConfig) {
                    v.props = _.merge({}, JSON.parse(commonConfig.props), v.props);
                    v.ssrProps = _.merge({}, JSON.parse(commonConfig.ssrProps), v.ssrProps);
                }
            });
        }

        v = _.omitBy(v, v => v === null || (typeof v === 'object' && Object.keys(v).length === 0));
        acc[v.name] = _.pick(v, ['kind', 'ssr', 'dependencies', 'props', 'ssrProps', 'spaBundle', 'cssBundle', 'wrappedWith']);

        return acc;
    }, {});

    data.templates = templates.map(({name}) => name);

    routes.forEach(routeItem => {
        routeItem = transformSpecialRoutesForConsumer(routeItem);

        const currentRoutesList = routeItem.specialRole ? data.specialRoutes : data.routes;

        let routeData = currentRoutesList.find(({ routeId }) => routeId === routeItem.routeId);

        if (routeData === undefined) {
            routeItem.next = !!routeItem.next;
            routeItem.template = routeItem.templateName;

            const domain = routeItem.domainId ? routerDomains.find(
                ({ id }) => id === routeItem.domainId
            )?.domainName : null;

            routeItem.domain = domain || '*';
            delete routeItem.domainId;

            routeData = Object.assign({
                slots: {},
                meta: {},
            }, _.omitBy(_.pick(routeItem, ['routeId', 'route', 'next', 'template', 'specialRole', 'domain']), _.isNull));

            currentRoutesList.push(routeData);
        }

        if (routeItem.name !== null) {
            routeData.slots[routeItem.name] = {
                appName: routeItem.appName,
                props: routeItem.props !== null ? JSON.parse(routeItem.props) : {},
                kind: routeItem.kind,
            };
        }

        if (routeItem.meta !== null) {
            routeData.meta = JSON.parse(routeItem.meta);
        }
    });

    data.settings = preProcessResponse(settings).reduce((acc: {[key: string]: any}, setting: Setting) => {
        _.set(acc, setting.key, setting.value);
        return acc;
    }, {});

    data.sharedLibs = sharedLibs.reduce((acc, { name, spaBundle }) => {
        acc[name] = spaBundle;
        return acc;
    }, {});

    res.locals.data = data;
    return next();
});

export default router;
