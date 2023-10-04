import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<any> {
    const table = 'router_domains';
    await knex(table).insert([
        {
            id: 1,
            domainName: '127.0.0.1:8233',
            template500: '500ForLocalhostAsIPv4',
        },
    ]);
    await knex(table).syncSequence();
}
