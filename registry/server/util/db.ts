import config from 'config';
import { Knex } from 'knex';

import { ForeignConstraintError } from '../errorHandler/httpErrors';
import { getLogger } from './logger';

export const PG_UNIQUE_VIOLATION_CODE = '23505';
export const PG_FOREIGN_KEY_VIOLATION_CODE = '23503';

export function extractInsertedId([insertResult]: ({ id: number } | number)[]): number {
    return typeof insertResult === 'number' ? insertResult : insertResult.id;
}

export function formatDate(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Returns true when `err` is a unique-constraint violation for the given constraint.
 *
 * @param constraint  Knex-generated constraint name (e.g. `router_domains_alias_unique`).
 */
export function isUniqueConstraintError(err: unknown, constraint: string): boolean {
    const e = err as Record<string, unknown>;
    return e?.code === PG_UNIQUE_VIOLATION_CODE && e?.constraint === constraint;
}

/** Returns true when `err` is a foreign key violation of the given constraint */
export function isForeignKeyViolation(err: unknown, constraint: string): boolean {
    const e = err as Record<string, unknown>;
    return e?.code === PG_FOREIGN_KEY_VIOLATION_CODE && e?.constraint === constraint;
}

export function handleForeignConstraintError(err: Error) {
    if (err.message.includes('violates foreign key constraint')) {
        throw new ForeignConstraintError();
    }
}

export function logConnectionString() {
    const { user, host }: Knex.PgConnectionConfig = config.get('database.connection');
    getLogger().info(`Connected to ${user}@${host} using pg`);
}
