import { Knex } from 'knex';
import { isSqlite } from '../util/db';

export async function up(knex: Knex): Promise<any> {
    if (!isSqlite(knex)) {
        return knex.schema.table('routes', (table) => {
            table.integer('domainId', 10).unsigned().nullable().references('router_domains.id');

            table.dropUnique(['specialRole'], 'routes_specialrole_unique');
            table.unique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');
        });
    } else {
        return Promise.resolve()
            .then(() => knex.schema.renameTable('routes', 'old_routes'))
            .then(() =>
                knex.schema.alterTable('old_routes', (table) => {
                    table.dropUnique(['specialRole'], 'routes_specialrole_unique');
                    table.dropUnique(['orderPos'], 'routes_orderpos_unique');
                    table.unique(['specialRole'], 'old_routes_specialrole_unique');
                    table.unique(['orderPos'], 'old_routes_orderpos_unique');
                }),
            )
            .then(() =>
                knex.schema.createTable('routes', (table) => {
                    table.increments('id');
                    table.enum('specialRole', ['404']).nullable();
                    table.integer('orderPos', 10).notNullable().unique('routes_orderpos_unique');
                    table.string('route', 255).notNullable();
                    table.boolean('next').notNullable().defaultTo(false);
                    table.string('templateName', 50).nullable().references('templates.name');
                    table.text('meta');
                    table.integer('domainId', 10).unsigned().nullable().references('router_domains.id');
                    table.unique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');
                }),
            )
            .then(() => knex('old_routes').select())
            .then((rows) => (rows.length ? knex('routes').insert(rows) : []))
            .then(() => knex.schema.renameTable('route_slots', 'old_route_slots'))
            .then(() =>
                knex.schema.createTable('route_slots', (table) => {
                    table.increments('id');
                    table.integer('routeId', 10).unsigned().notNullable().references('routes.id');
                    table.string('name', 255).notNullable();
                    table.string('appName', 50).notNullable().references('apps.name');
                    table.json('props');
                    table.enu('kind', ['primary', 'essential', 'regular']);
                }),
            )
            .then(() => knex('old_route_slots').select())
            .then((rows) => (rows.length ? knex('route_slots').insert(rows) : []));
    }
}

export async function down(knex: Knex): Promise<any> {
    if (!isSqlite(knex)) {
        return knex.schema.table('routes', (table) => {
            table.dropUnique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');
            table.unique(['specialRole'], 'routes_specialrole_unique');

            table.dropColumn('domainId');
        });
    } else {
        return Promise.resolve()
            .then(() => knex.schema.dropTable('routes'))
            .then(() => knex.schema.renameTable('old_routes', 'routes'))
            .then(() => knex.schema.dropTable('route_slots'))
            .then(() => knex.schema.renameTable('old_route_slots', 'route_slots'))
            .then(() =>
                knex.schema.alterTable('routes', (table) => {
                    table.dropUnique(['specialRole'], 'old_routes_specialrole_unique');
                    table.dropUnique(['orderPos'], 'old_routes_orderpos_unique');
                    table.unique(['specialRole'], 'routes_specialrole_unique');
                    table.unique(['orderPos'], 'routes_orderpos_unique');
                }),
            );
    }
}
