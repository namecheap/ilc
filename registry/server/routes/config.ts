import _ from 'lodash';
import express from 'express';

import knex from '../db';
import {Setting, Scope} from '../settings/interfaces';
import preProcessResponse from '../settings/services/preProcessResponse';

const router = express.Router();

router.get('/', async (req, res) => {
    const [apps, templates, routes, sharedProps, settings, routerDomains] = await Promise.all([
        knex.select().from('apps'),
        knex.select('name').from('templates'),
        knex.select()
            .orderBy('orderPos', 'ASC')
            .from('routes')
            .join('route_slots', 'route_slots.routeId', 'routes.id'),
        knex.select().from('shared_props'),
        knex.select().from('settings').where('scope', Scope.Ilc),
        knex.select().from('router_domains'),
    ]);

    const data = {
        apps: {},
        templates: [] as string[],
        routes: [] as any[],
        specialRoutes: [] as any[],
        settings: {},
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

    routes.forEach(v => {
        const currentRoutesList = v.specialRole ? data.specialRoutes : data.routes;

        let routeData = currentRoutesList.find(({ routeId }) => routeId === v.routeId);

        if (routeData === undefined) {
            v.next = !!v.next;
            v.template = v.templateName;

            v.domain = v.domainId === null ? null : routerDomains.find(({ id }) => id === v.domainId).domainName;
            delete v.domainId;

            routeData = Object.assign({
                slots: {},
                meta: {},
            }, _.omitBy(_.pick(v, ['routeId', 'route', 'next', 'template', 'specialRole', 'domain']), _.isNull));

            currentRoutesList.push(routeData);
        }

        if (v.name !== null) {
            routeData.slots[v.name] = {
                appName: v.appName,
                props: v.props !== null ? JSON.parse(v.props) : {},
                kind: v.kind,
            };
        }

        if (v.meta !== null) {
            routeData.meta = JSON.parse(v.meta);
        }
    });

    data.settings = preProcessResponse(settings).reduce((acc: {[key: string]: any}, setting: Setting) => {
        _.set(acc, setting.key, setting.value);
        return acc;
    }, {});

    return res.send(data);
});

export default router;
