import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (isMySQL(knex)) {
        return knex.raw("ALTER TABLE `apps` " +
            "MODIFY COLUMN `kind` " +
            "enum('primary', 'essential','regular','wrapper') " +
            "NOT NULL DEFAULT 'regular';");
    } else {
        await alterSqliteTable(knex, 'apps', `
            name varchar(50) not null primary key,
            spaBundle varchar(255) not null,
            cssBundle varchar(255),
            dependencies json,
            ssr json,
            props json,
            assetsDiscoveryUrl varchar(255),
            assetsDiscoveryUpdatedAt integer,
            kind text default 'regular',
            configSelector varchar(255),
            check (\`kind\` in ('primary', 'essential', 'regular', 'wrapper'))
        `);
    }
}


export async function down(knex: Knex): Promise<void> {
    if (isMySQL(knex)) {
        return knex.raw("ALTER TABLE `apps` " +
            "MODIFY COLUMN `kind` " +
            "enum('primary', 'essential','regular') " +
            "NOT NULL DEFAULT 'regular';");
    } else {
        await alterSqliteTable(knex,'apps', `
            name varchar(50) not null primary key,
            spaBundle varchar(255) not null,
            cssBundle varchar(255),
            dependencies json,
            ssr json,
            props json,
            assetsDiscoveryUrl varchar(255),
            assetsDiscoveryUpdatedAt integer,
            kind text default 'regular',
            configSelector varchar(255),
            check (\`kind\` in ('primary', 'essential', 'regular'))
        `);
    }
}

async function alterSqliteTable(knex: Knex, tableName: string, columnsSql: string):Promise<void> {
    try {
        await knex.schema.raw(`PRAGMA foreign_keys=off;`);
        await knex.transaction(async trx => {
            await trx.raw(`CREATE TABLE tbl_tmp (${columnsSql});`);
            await trx.raw(`INSERT INTO tbl_tmp SELECT * FROM \`${tableName}\`;`);
            await trx.raw(`DROP TABLE \`${tableName}\`;`);
            await trx.raw(`ALTER TABLE tbl_tmp RENAME TO \`${tableName}\`;`);
        });
    } finally {
        await knex.schema.raw(`PRAGMA foreign_keys=on;`);
    }

}

function isMySQL(knex: Knex) {
    return ["mysql", "mariasql", "mariadb"].indexOf(knex.client.dialect) > -1;
}
