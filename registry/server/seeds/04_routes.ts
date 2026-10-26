import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<any> {
    const table = 'routes';
    await knex(table).insert([
        {
            id: 1,
            orderPos: 0,
            route: '*',
            next: true,
            templateName: 'master',
        },
        {
            id: 2,
            orderPos: 10,
            route: '/news/*',
            next: false,
        },
        {
            id: 3,
            orderPos: 20,
            route: '/people/*',
            next: false,
        },
        {
            id: 4,
            orderPos: 30,
            route: '/planets/*',
            next: false,
        },
        {
            id: 7,
            route: 'special:404',
            next: false,
            templateName: 'master',
        },
        {
            id: 8,
            orderPos: 3,
            route: '/',
            next: false,
        },
        {
            id: 9,
            orderPos: 40,
            route: '/wrapper/',
            next: false,
        },
        {
            id: 10,
            orderPos: 50,
            route: '/hooks/',
            next: false,
        },
        {
            id: 11,
            orderPos: 60,
            route: '/hooks/protected/',
            next: false,
            meta: {
                protected: true,
            },
        },
        {
            id: 12,
            route: 'special:404',
            next: false,
            templateName: 'master',
            domainId: 1,
        },
        {
            id: 13,
            orderPos: 70,
            route: '/missing-slot-in-tpl/',
            next: false,
        },
        // Several apps per slot and keep-alive (e2e: multiAppSlots, keepAlive)
        {
            id: 14,
            orderPos: 80,
            route: '/multi/planets/*',
            next: false,
            templateName: 'stack',
        },
        {
            id: 15,
            orderPos: 81,
            route: '/keep-alive/people/*',
            next: false,
            templateName: 'stack',
        },
        {
            id: 16,
            orderPos: 82,
            route: '/keep-alive/planets/*',
            next: false,
            templateName: 'stack',
        },
        {
            id: 17,
            orderPos: 83,
            route: '/multi/ssr/*',
            next: false,
            templateName: 'stack',
        },
        {
            id: 18,
            orderPos: 84,
            route: '/keep-alive/ssr/*',
            next: false,
            templateName: 'stack',
        },
    ]);
    await knex(table).syncSequence();
}
