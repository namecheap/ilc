import type { RaRecord } from 'react-admin';

export const types = {
    url: 'url',
    boolean: 'boolean',
    string: 'string',
    stringArray: 'string[]',
    enum: 'enum',
    password: 'password',
    json: 'json',
} as const;

export interface SettingMeta {
    type: (typeof types)[keyof typeof types];
    choices?: string[];
}

/** A setting as the Registry API returns it */
export interface SettingDto {
    key: string;
    value?: unknown;
    default?: unknown;
    domainId?: number | null;
    meta?: SettingMeta;
    [key: string]: unknown;
}

export interface SettingChoice {
    id: string;
    name: string;
}

/**
 * A setting overridden for a router domain has the key of the global one, so its id carries the domain too.
 * Setting keys are dotted names, "@" does not occur in them.
 */
export function toSettingId(key: string, domainId?: number | string | null) {
    return domainId ? `${key}@${domainId}` : key;
}

export function parseSettingId(id: string): { key: string; domainId?: string } {
    const separator = id.lastIndexOf('@');

    return separator === -1 ? { key: id } : { key: id.slice(0, separator), domainId: id.slice(separator + 1) };
}

export function transformGet(setting: SettingDto): RaRecord {
    const record: RaRecord = { ...setting, id: toSettingId(setting.key, setting.domainId) };

    if (setting.meta && setting.meta.type === types.enum) {
        record.meta = {
            ...setting.meta,
            choices: (setting.meta.choices ?? []).map((choice): SettingChoice => ({ id: choice, name: choice })),
        };
    }

    if (setting.default === undefined) {
        record.default = null;
    }

    if (setting.value === undefined) {
        record.value = null;
    }

    record.domainId = setting.domainId || null;

    return record;
}

export function transformSet(setting: Partial<RaRecord>) {
    if (setting.protected) {
        throw new Error(`The '${setting.key}' setting cannot be modified through UI`);
    }

    return {
        key: setting.key,
        value: setting.value === null ? '' : setting.value,
        domainId: setting.domainId,
    };
}
