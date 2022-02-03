import { Knex } from "knex";
import * as bcrypt from 'bcrypt';


export async function up(knex: Knex): Promise<any> {
    return knex.table('auth_entities').insert([{
        identifier: 'root',
        secret: await bcrypt.hash('pwd', await bcrypt.genSalt()),
        provider: 'local',
        role: 'admin',
    },{
        identifier: 'root_api_token',
        secret: await bcrypt.hash('token_secret', await bcrypt.genSalt()),
        provider: 'bearer',
        role: 'admin',
    }]);
}


export async function down(knex: Knex): Promise<any> {
}

