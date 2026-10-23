import { type Knex } from 'knex';
import { z } from 'zod';

export enum EntityTypes {
    apps = 'apps',
    routes = 'routes',
    auth_entities = 'auth_entities',
    settings = 'settings',
    shared_props = 'shared_props',
    templates = 'templates',
    router_domains = 'router_domains',
    shared_libs = 'shared_libs',
    settings_domain_value = 'settings_domain_value',
}

export interface OperationConfig {
    type: EntityTypes | keyof typeof EntityTypes;
    trxProvider?: Knex.TransactionProvider;
    trx?: Knex.Transaction;
    id?: string | number;
}

interface VersionRowBase {
    entity_type: string;
    entity_id: string;
    created_by: string;
}

/** A version to insert: created_at is written as text */
export interface VersionRowData extends VersionRowBase {
    data: string | null;
    data_after: string | null;
    created_at: string;
}

/** A versioning row as PostgreSQL returns it, created_at is a timestamptz */
export interface VersionRow extends Omit<VersionRowData, 'created_at'> {
    id: number;
    created_at: Date;
}

export interface VersionRowParsed extends VersionRowBase {
    id: number;
    created_at: Date;
    data: { data: object; related: Record<string, object[]> } | null;
    data_after: { data: object; related: Record<string, object[]> } | null;
}

export interface WithVersionId {
    versionId: number | string;
}

export type VersionedRecord<T> = T & WithVersionId;

/** Unknown filters are ignored, as before */
export const versionsFiltersSchema = z.object({
    id: z.array(z.coerce.number()).optional(),
    entity_type: z.string().optional(),
    entity_id: z.string().optional(),
    created_by: z.string().optional(),
});

export const versionsListQuerySchema = z.object({
    range: z.string().optional(),
});

export type VersionsFilters = z.output<typeof versionsFiltersSchema>;
