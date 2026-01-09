import { EntityTypes } from '../interfaces';

export const SECRET_MARKER = '[SECRET]';
export const LEGACY_MARKER = '[REDACTED]';

export type Snapshot = { data: Record<string, any>; related: Record<string, any[]> };

export function isSecretMarker(value: unknown): boolean {
    return value === SECRET_MARKER || value === LEGACY_MARKER;
}

export function stripSecretFields(data: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(data).filter(([_, value]) => !isSecretMarker(value)));
}

export function sanitizeSnapshot(entityType: string, snapshot: Snapshot, secretKeys: Set<string>): Snapshot {
    const result: Snapshot = {
        data: { ...snapshot.data },
        related: Object.fromEntries(
            Object.entries(snapshot.related).map(([key, arr]) => [key, arr.map((item) => ({ ...item }))]),
        ),
    };

    if (entityType === EntityTypes.settings && result.data.secret) {
        result.data.value = SECRET_MARKER;
        if (result.data.default !== undefined) {
            result.data.default = SECRET_MARKER;
        }
    }

    if (entityType === EntityTypes.settings_domain_value && secretKeys.has(result.data.key)) {
        result.data.value = SECRET_MARKER;
    }

    if (entityType === EntityTypes.auth_entities && result.data.secret) {
        result.data.secret = SECRET_MARKER;
    }

    return result;
}
