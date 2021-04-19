import * as Knex from 'knex';

export async function seed(knex: Knex): Promise<any> {
    return knex("router_domains").insert([
        {
            id: 1,
            domainName: '127.0.0.1:8233',
            template500: '500ForLocalhostAsIPv4',
        },
    ]);
}
