import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<any> {
    const table = 'route_slots';
    await knex(table).insert([
        {
            routeId: 1, // *
            name: 'navbar',
            appName: '@portal/navbar',
        },
        {
            routeId: 2, // /news/*
            name: 'body',
            appName: '@portal/news',
        },
        {
            routeId: 3, // /people/*
            name: 'body',
            appName: '@portal/people',
        },
        {
            routeId: 4, // /planets/*
            name: 'body',
            appName: '@portal/planets',
        },
        {
            routeId: 7, // Special: 404
            name: 'navbar',
            appName: '@portal/navbar',
        },
        {
            routeId: 7, // Special: 404
            name: 'body',
            appName: '@portal/system',
            props: { _statusCode: '404' },
        },
        {
            routeId: 8, // /
            name: 'body',
            appName: '@portal/system',
            props: {
                page: 'home',
            },
        },
        {
            routeId: 9, // /wrapper/
            name: 'body',
            appName: '@portal/systemWithWrapper',
            props: {
                page: 'wrapped',
            },
        },
        {
            routeId: 10, // /hooks/
            name: 'body',
            appName: '@portal/system',
            props: {
                page: 'hooks',
            },
        },
        {
            routeId: 11, // /hooks/protected/
            name: 'body',
            appName: '@portal/system',
            props: {
                page: 'hooks-protected',
            },
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
            props: {
                _statusCode: '404',
                title: '404 not found on 127.0.0.1',
            },
        },
        {
            routeId: 13, // /missing-slot-in-tpl/
            name: 'invalid-slot',
            kind: 'regular',
            appName: '@portal/system',
            props: {
                page: 'home',
            },
        },
    ]);

    // Several apps per slot and keep-alive (e2e: multiAppSlots, keepAlive). Inserted separately with
    // every column set: a multi-row insert fills columns missing on some rows with NULL, not with
    // the column default.
    await knex(table).insert([
        // /multi/planets/*: two apps in the stack slot, rendered in this order (the planets demo app routes on a
        // hard-coded "planets" segment, people takes the route base path)
        {
            routeId: 14,
            name: 'stack',
            appName: '@portal/people',
            position: 0,
            keepAlive: false,
        },
        {
            routeId: 14,
            name: 'stack',
            appName: '@portal/planets',
            position: 1,
            keepAlive: false,
        },
        // /keep-alive/people/*: people stays mounted (hidden) while planets owns the slot
        {
            routeId: 15,
            name: 'stack',
            appName: '@portal/people',
            position: 0,
            keepAlive: true,
        },
        {
            routeId: 16,
            name: 'stack',
            appName: '@portal/planets',
            position: 0,
            keepAlive: false,
        },
        // /multi/ssr/*: a server-rendered app (system) and a client-only app (people) in one slot
        {
            routeId: 17,
            name: 'stack',
            appName: '@portal/system',
            props: { page: 'home' },
            position: 0,
            keepAlive: false,
        },
        {
            routeId: 17,
            name: 'stack',
            appName: '@portal/people',
            position: 1,
            keepAlive: false,
        },
        // /keep-alive/ssr/*: the server-rendered app stays mounted (hidden) while planets owns the slot
        {
            routeId: 18,
            name: 'stack',
            appName: '@portal/system',
            props: { page: 'home' },
            position: 0,
            keepAlive: true,
        },
    ]);
    await knex(table).syncSequence();
}
