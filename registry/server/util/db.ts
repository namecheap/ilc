import config from 'config';
import { Knex } from 'knex';

import { ForeignConstraintError } from '../errorHandler/httpErrors';
import { getLogger } from './logger';

export const PG_UNIQUE_VIOLATION_CODE = '23505';
export const PG_FOREIGN_KEY_VIOLATION_CODE = '23503';

export function isMySQL(knex: Knex): boolean {
    return ['mysql', 'mariasql', 'mariadb'].indexOf(knex.client.dialect) > -1;
}

export function isPostgres(knex: { client: Knex.Client }): boolean {
    return ['postgresql'].indexOf(knex.client.dialect) > -1;
}

export function isSqlite(knex: Knex): boolean {
    return ['sqlite3'].indexOf(knex.client.dialect) > -1;
}

export function extractInsertedId([insertResult]: ({ id: number } | number)[]): number {
    return typeof insertResult === 'number' ? insertResult : insertResult.id;
}

export function formatDate(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function handleForeignConstraintError(err: Error) {
    if (
        ['foreign key constraint fails', 'FOREIGN KEY constraint failed', 'violates foreign key constraint'].some((v) =>
            err.message.includes(v),
        )
    ) {
        throw new ForeignConstraintError();
    }
}

export function logConnectionString() {
    const client: string = config.get('database.client');
    const connectionConfig: Knex.StaticConnectionConfig = config.get('database.connection');
    const host =
        client === 'sqlite'
            ? (connectionConfig as Knex.Sqlite3ConnectionConfig).filename
            : `${(connectionConfig as Knex.MySqlConnectionConfig).user}@${
                  (connectionConfig as Knex.MySqlConnectionConfig).host
              }`;
    getLogger().info(`Connected to ${host} using ${client}`);
}
