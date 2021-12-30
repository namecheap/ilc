import * as Knex from "knex";

export async function seed(knex: Knex): Promise<any> {
    return knex("route_slots").insert([
        {
            routeId: 1, // *
            name: 'navbar',
            appName: '@portal/navbar',
            props: JSON.stringify({
                foo: 'default'
            }),
        },
        {
            routeId: 2, // /news/*
            name: 'body',
            appName: '@portal/news',
        },



        {
            routeId: 3,
            name: 'navbar',
            appName: '@portal/navbar',
            props: JSON.stringify({
                foo: 'PEOPLE'
            }),
        },
        {
            routeId: 3, // /people/*
            name: 'body',
            appName: '@portal/people',
        },


        {
            routeId: 4,
            name: 'navbar',
            appName: '@portal/navbar',
            props: JSON.stringify({
                foo: 'PLANETS'
            }),
        },
        {
            routeId: 4, // /planets/*
            name: 'body',
            appName: '@portal/planets',
        }, {
            routeId: 7, // Special: 404
            name: 'navbar',
            appName: '@portal/navbar',
        }, {
            routeId: 7, // Special: 404
            name: 'body',
            appName: '@portal/system',
            props: JSON.stringify({ _statusCode: '404' }),
        }, {
            routeId: 8, // /
            name: 'body',
            appName: '@portal/system',
            props: JSON.stringify({
                page: 'home'
            }),
        }, {
            routeId: 9, // /wrapper/
            name: 'body',
            appName: '@portal/systemWithWrapper',
            props: JSON.stringify({
                page: 'wrapped'
            }),
        }, {
            routeId: 10, // /hooks/
            name: 'body',
            appName: '@portal/system',
            props: JSON.stringify({
                page: 'hooks'
            }),
        }, {
            routeId: 11, // /hooks/protected/
            name: 'body',
            appName: '@portal/system',
            props: JSON.stringify({
                page: 'hooks-protected'
            }),
        },
        {
            routeId: 12, // Special: 404 only for 127.0.0.1
            name: 'navbar',
            appName: '@portal/navbar',
        },
        {
            routeId: 12, // Special: 404 only for 127.0.0.1
            name: 'body',
            appName: '@portal/system',
            props: JSON.stringify({ _statusCode: '404', title: '404 not found on 127.0.0.1' }),
        },
        {
            routeId: 13, // /missing-slot-in-tpl/
            name: 'invalid-slot',
            kind: 'regular',
            appName: '@portal/system',
            props: JSON.stringify({
                page: 'home'
            }),
        }
    ]);
}
