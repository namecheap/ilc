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
        acc[v.name] = Buffer.from(v.content).toString('utf-8');
        return acc;
    }, {});

    const routesTmp: any = {};
    routes.forEach(v => {
        if (routesTmp[v.routeId] === undefined) {
            v.next = !!v.next;
            v.template = v.templateName;
            delete v.templateName;


            routesTmp[v.routeId] = Object.assign(
                {slots: {}},
                _.omitBy(_.pick(v, ['route', 'next', 'template', 'specialRole']), _.isNull)
            );
        }

        routesTmp[v.routeId].slots[v.name] = {
            appName: v.appName,
            props: v.props !== null ? JSON.parse(v.props) : {},
        };
    });

    data.routes = _.compact(_.map(routesTmp, v => {
        if (v.specialRole !== undefined) {
            return null;
        }

        delete v.specialRole;

        return v;
    }));

    data.specialRoutes = _.reduce(_.filter(routesTmp, v => !!v.specialRole), (acc: any, v) => {
        acc[v.specialRole] = _.omit(v, ['specialRole']);
        return acc;
    }, {});

    return res.send(JSON.stringify(data));
});

export default router;