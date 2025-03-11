import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return Promise.resolve()
        .then(() => knex('routes').select())
        .then((rows) => {
            const promises = rows.map((row) => {
                // @ts-expect-error no such field in recent version
                if (!row.specialRole) {
                    return;
                }

                return knex('routes')
                    .where('id', row.id)
                    .update({
                        // @ts-expect-error no such field in recent version
                        route: `special:${row.specialRole}`,
                        orderPos: null,
                        // @ts-expect-error no such field in recent version
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
            const promises = rows.map((row) => {
                if (!row.route.startsWith('special:')) {
                    return;
                }

                return knex('routes')
                    .where('id', row.id)
                    .update({
                        route: '',
                        orderPos: --specialOrderPos,
                        // @ts-expect-error no such field in recent version
                        specialRole: row.route.replace('special:', ''),
                    });
            });

            return Promise.all(promises);
        });
}
