import config from 'config';

import { EntityTypes } from '../../versioning/interfaces';

/**
 * Special routes (e.g. the 404 handlers) can be protected independently of regular routes:
 * regular routes are usually registered by application deployments, while special routes are
 * often managed from a configuration repository.
 */
export const SPECIAL_ROUTES_ENTITY = 'special_routes';

export type ProtectedEntity = EntityTypes | typeof SPECIAL_ROUTES_ENTITY;

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
 * (ILC_REGISTRY_ADMIN_PROTECTED_ENTITIES, comma-separated EntityTypes values plus
 * "special_routes", e.g. "router_domains,shared_props,special_routes"). Protected records get
 * "protected: true" in API responses so the admin UI disables editing them; the REST API itself
 * stays writable for the external management pipeline.
 */
export function markProtected<T extends object>(entity: ProtectedEntity, record: T): T & { protected?: boolean };
export function markProtected<T extends object>(entity: ProtectedEntity, records: T[]): (T & { protected?: boolean })[];
export function markProtected<T extends object>(entity: ProtectedEntity, data: T | T[]) {
    if (!getProtectedEntities().includes(entity)) {
        return data;
    }
    return Array.isArray(data) ? data.map((record) => ({ ...record, protected: true })) : { ...data, protected: true };
}

/**
 * Routes are protected either as a whole ("routes") or only their special variants
 * ("special_routes"), so each record is classified by its own kind.
 */
export function routeEntity(route: { specialRole?: string }): ProtectedEntity {
    return route.specialRole ? SPECIAL_ROUTES_ENTITY : EntityTypes.routes;
}
