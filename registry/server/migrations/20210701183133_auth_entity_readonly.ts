import * as Knex from "knex";
import * as bcrypt from 'bcrypt';

export async function up(knex: Knex): Promise<any> {
    return knex.table('auth_entities').insert([{
        identifier: 'readonly',
        secret: await bcrypt.hash('pwd', await bcrypt.genSalt()),
        provider: 'local',
        role: 'readonly',
    }]);
}


export async function down(knex: Knex): Promise<any> {
    await knex('auth_entities').where('identifier', 'readonly').delete();
}
