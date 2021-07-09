import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
    return Promise.resolve()
        .then(() => knex('auth_entities').select())
        .then((rows) => {
            const promises = rows.map(row => {
                if (row.role !== 'user') {
                    return;
                }

                return knex('auth_entities').where('id', row.id).update({
                    role: 'readonly',
                });
            });

            return Promise.all(promises);
        });
}


export async function down(knex: Knex): Promise<any> {
    return Promise.resolve()
        .then(() => knex('auth_entities').select())
        .then((rows) => {
            const promises = rows.map(row => {
                if (row.role !== 'readonly') {
                    return;
                }

                return knex('auth_entities').where('id', row.id).update({
                    role: 'user',
                });
            });

            return Promise.all(promises);
        });
}
