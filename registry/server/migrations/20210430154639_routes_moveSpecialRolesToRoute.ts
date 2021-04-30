import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
    return Promise.resolve()
        .then(() => knex('routes').select())
        .then((rows) => {
            const promises = rows.map(row => {
                if (!row.specialRole) {
                    return;
                }

                return knex('routes').where('id', row.id).update({
                    route: `special:${row.specialRole}`,
                    orderPos: null,
                    specialRole: null,
                });
            });

            return Promise.all(promises);
        });
}


export async function down(knex: Knex): Promise<any> {
    return Promise.resolve()
        .then(() => knex('routes').select())
        .then((rows) => {
            let specialOrderPos = -10000;
            const promises = rows.map(row => {
                if (!row.route.startsWith('special:')) {
                    return;
                }

                return knex('routes').where('id', row.id).update({
                    route: '',
                    orderPos: --specialOrderPos,
                    specialRole: row.route.replace('special:', ''),
                });
            });

            return Promise.all(promises);
        });
}
