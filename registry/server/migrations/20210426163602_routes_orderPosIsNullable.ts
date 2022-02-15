import { Knex } from "knex";

export async function up(knex: Knex): Promise<any> {
    if (isMySQL(knex)) {
        return Promise.resolve()
            .then(() => knex.schema.alterTable('routes', table => {
                table.integer('orderPos', 10).nullable().alter({}); // alter table don't affect only uniq constraint, so you don't need and it's disallowed to set unique('routes_orderpos_unique') here
            }))
    } else {
        // SQLite doesn't support alter columns
        return Promise.resolve()
            .then(() => knex.schema.renameTable('routes', 'old_routes_2'))
            .then(() => knex.schema.alterTable('old_routes_2', table => {
                table.dropUnique(['orderPos'], 'routes_orderpos_unique');
                table.unique(['orderPos'], 'old_routes_2_orderpos_unique');

                table.dropUnique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');
                table.unique(['specialRole', 'domainId'], 'old_routes_2_specialrole_and_domainId_unique');
            }))
            .then(() => knex.schema.createTable('routes', table => {
                table.increments('id');
                table.enum('specialRole', ['404']).nullable(); // ADDED
                table.integer('orderPos', 10).nullable().unique('routes_orderpos_unique');
                table.string('route', 255).notNullable();
                table.boolean('next').notNullable().defaultTo(false);
                table.string('templateName', 50).nullable().references('templates.name');
                table.text('meta');
                table.integer('domainId', 10).unsigned().nullable().references('router_domains.id');
                table.unique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');  // CHANGED
            }))
            .then(() => knex('old_routes_2').select())
            .then((rows) => rows.length ? knex('routes').insert(rows) : [])
            .then(() => knex.schema.renameTable('route_slots', 'old_route_slots_2'))
            .then(() => knex.schema.createTable('route_slots', table => {
                table.increments('id');
                table.integer('routeId', 10).unsigned().notNullable().references('routes.id');
                table.string('name', 255).notNullable();
                table.string('appName', 50).notNullable().references('apps.name');
                table.json('props');
                table.enu('kind', ['primary', 'essential', 'regular']);
            }))
            .then(() => knex('old_route_slots_2').select())
            .then((rows) => rows.length ? knex('route_slots').insert(rows) : []);
    }
}


export async function down(knex: Knex): Promise<any> {
    if (isMySQL(knex)) {
        return Promise.resolve()
            .then(() => knex.schema.alterTable('routes', table => {
                table.integer('orderPos', 10).notNullable().alter({});
            }));
    } else {
        return Promise.resolve()
            .then(() => knex.schema.dropTable('routes'))
            .then(() => knex.schema.renameTable('old_routes_2', 'routes'))
            .then(() => knex.schema.dropTable('route_slots'))
            .then(() => knex.schema.renameTable('old_route_slots_2', 'route_slots'))
            .then(() => knex.schema.alterTable('routes', table => {
                table.dropUnique(['orderPos'], 'old_routes_2_orderpos_unique');
                table.unique(['orderPos'], 'routes_orderpos_unique');

                table.dropUnique(['specialRole', 'domainId'], 'old_routes_2_specialrole_and_domainId_unique');
                table.unique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');
            }));
    }
}

function isMySQL(knex: Knex) {
    return ["mysql", "mariasql", "mariadb"].indexOf(knex.client.dialect) > -1;
}
