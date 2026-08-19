import fs from 'node:fs';
import path from 'node:path';

import type { Knex } from 'knex';

export interface MigrationFile {
    file: string;
    directory: string;
}

/**
 * Migration source that can load pre-compiled (.js) migrations from the build output.
 * Migration names are always reported with the ".ts" extension to stay compatible
 * with the records knex has already stored in the "knex_migrations" table.
 */
export class PrecompiledMigrationSource implements Knex.MigrationSource<MigrationFile> {
    constructor(private readonly directory: string) {}

    public async getMigrations(): Promise<MigrationFile[]> {
        const files = await fs.promises.readdir(this.directory);

        return files
            .filter((file) => (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts'))
            .sort()
            .map((file) => ({ file, directory: this.directory }));
    }

    public getMigrationName(migration: MigrationFile): string {
        return migration.file.replace(/\.js$/, '.ts');
    }

    public getMigration(migration: MigrationFile): Promise<Knex.Migration> {
        return Promise.resolve(require(path.resolve(migration.directory, migration.file)));
    }
}
