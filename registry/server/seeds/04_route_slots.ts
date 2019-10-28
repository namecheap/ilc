import * as Knex from "knex";

export async function seed(knex: Knex): Promise<any> {
    // Deletes ALL existing entries
    return knex("route_slots").del()
        .then(() => {
            // Inserts seed entries
            return knex("route_slots").insert([
                {
                    routeId: 1, // *
                    name: 'navbar',
                    appName: '@portal/navbar',
                }, {
                    routeId: 2, // /news/*
                    name: 'body',
                    appName: '@portal/news',
                }, {
                    routeId: 3, // /people/*
                    name: 'body',
                    appName: '@portal/people',
                }, {
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
                },
            ]);
        });
}
