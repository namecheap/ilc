import * as Knex from "knex";
import config from 'config';
import * as bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
    const rootPassword = config.get('database.rootPassword');

    if (rootPassword) {
        await knex('auth_entities')
            .where('identifier', 'root')
            .update({ secret: await bcrypt.hash(rootPassword, await bcrypt.genSalt()) });
    }
};
