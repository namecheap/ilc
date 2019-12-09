import _ from 'lodash';
import express from 'express';
import knex from '../db';

const router = express.Router();

router.get('/', async (req, res) => {
    const [apps, templates, routes] = await Promise.all([
        knex.select().from('apps'),
        knex.select().from('templates'),
        knex.select('routes.id as routeId', '*')
            .orderBy('orderPos', 'ASC')
            .from('routes')
            .join('route_slots', 'route_slots.routeId', 'routes.id')
    ]);

    const data = {
        apps: {},
        templates: {},
        routes: [] as any[],
        specialRoutes: {},
    };

    data.apps = apps.reduce((acc, v) => {
        v.ssr = JSON.parse(v.ssr);
        v.dependencies = JSON.parse(v.dependencies);
        v.initProps = JSON.parse(v.initProps);
        v.props = JSON.parse(v.props);

        v = _.omitBy(v, v => v === null || (typeof v === 'object' && Object.keys(v).length === 0));
        acc[v.name] = _.omit(v, ['name']);

        return acc;
    }, {});

    data.templates = templates.reduce((acc, v) => {
        acc[v.name] = v.content;
        return acc;
    }, {});

    const routesTmp: Array<any> = [];
    routes.forEach(v => {
        let tmpRoute = routesTmp.find(({ routeId }) => routeId === v.routeId);

        if (tmpRoute === undefined) {
            v.next = !!v.next;
            v.template = v.templateName;

            tmpRoute = Object.assign(
                {slots: {}},
                _.omitBy(_.pick(v, ['routeId', 'route', 'next', 'template', 'specialRole']), _.isNull)
            );
            routesTmp.push(tmpRoute);
        }

        tmpRoute.slots[v.name] = {
            appName: v.appName,
            props: v.props !== null ? JSON.parse(v.props) : {},
        };
    });

    data.routes = routesTmp.filter((route: any) => !route.specialRole);

    data.specialRoutes = _.reduce(_.filter(routesTmp, v => !!v.specialRole), (acc: any, v) => {
        acc[v.specialRole] = _.omit(v, ['specialRole']);
        return acc;
    }, {});

    return res.send(JSON.stringify(data));
});

export default router;
