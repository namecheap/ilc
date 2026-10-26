import { parseJSON } from '../../util/json';

function isEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string' || Array.isArray(value)) {
        return value.length === 0;
    }
    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }
    return false;
}

function omitEmptyValues(value: unknown): Record<string, unknown> {
    return Object.fromEntries(Object.entries(Object(value)).filter(([, item]) => !isEmptyValue(item)));
}

function omitPreResponseEmptyValues(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(omitEmptyValues);
    }
    if (typeof value === 'object' && value !== null) {
        return omitEmptyValues(value);
    }
    return value;
}

export function preProcessResponse(value: unknown): any {
    return omitPreResponseEmptyValues(parseJSON(value));
}
