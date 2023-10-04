import fs from 'fs';
import path from 'path';

import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<any> {
    const table = 'templates';
    await knex(table).insert([
        {
            name: 'master',
            content: fs.readFileSync(path.join(__dirname, './data/templates/master.html'), {
                encoding: 'utf8',
            }),
        },
        {
            name: '500',
            content: fs.readFileSync(path.join(__dirname, './data/templates/500.html'), {
                encoding: 'utf8',
            }),
        },
        {
            name: '500ForLocalhostAsIPv4',
            content: fs.readFileSync(path.join(__dirname, './data/templates/500ForLocalhostAsIPv4.html'), {
                encoding: 'utf8',
            }),
        },
    ]);
}
