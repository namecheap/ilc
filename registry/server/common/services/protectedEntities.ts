import config from 'config';

import { EntityTypes } from '../../versioning/interfaces';

function getProtectedEntities(): string[] {
    return config
        .get<string>('protectedEntities')
        .split(',')
        .map((entity) => entity.trim())
        .filter(Boolean);
}

/**
 * Entities managed externally (e.g. settings/router domains/shared props synced from a git
 * repository) can be marked protected via the "protectedEntities" config
 * (ILC_REGISTRY_ADMIN_PROTECTED_ENTITIES, comma-separated EntityTypes values,
 * e.g. "router_domains,shared_props"). Protected records get "protected: true" in API
 * responses so the admin UI disables editing them; the REST API itself stays writable
 * for the external management pipeline.
 */
export function markProtected<T extends object>(entity: EntityTypes, record: T): T & { protected?: boolean };
export function markProtected<T extends object>(entity: EntityTypes, records: T[]): (T & { protected?: boolean })[];
export function markProtected<T extends object>(entity: EntityTypes, data: T | T[]) {
    if (!getProtectedEntities().includes(entity)) {
        return data;
    }
    return Array.isArray(data) ? data.map((record) => ({ ...record, protected: true })) : { ...data, protected: true };
}
