import { isPlainObject } from './isPlainObject';

function mergeValue(targetValue: unknown, sourceValue: unknown): unknown {
    if (Array.isArray(sourceValue)) {
        return mergeInto(Array.isArray(targetValue) ? targetValue : [], sourceValue);
    }
    if (isPlainObject(sourceValue)) {
        return mergeInto(typeof targetValue === 'object' && targetValue !== null ? targetValue : {}, sourceValue);
    }
    return sourceValue === undefined ? targetValue : sourceValue;
}

function mergeInto<T extends object>(target: T, source: object): T {
    const record = target as Record<string, unknown>;
    for (const [key, value] of Object.entries(source)) {
        if (key === '__proto__') {
            continue;
        }
        record[key] = mergeValue(record[key], value);
    }
    return target;
}

/**
 * Recursively merges sources into target, left to right, with the semantics of lodash `merge` for JSON values:
 * plain objects merge key by key, arrays merge index by index, `undefined` source values are skipped
 * and any other value replaces the target value. Sources that are not objects are ignored.
 * Mutates and returns target; nested objects and arrays of the sources are copied, not shared.
 *
 * @example
 * deepMerge({}, { a: [1, 2, 3], b: { c: 1 } }, { a: ['x'], b: { d: 2 } });
 * // { a: ['x', 2, 3], b: { c: 1, d: 2 } }
 */
export function deepMerge<T extends object>(target: T, ...sources: unknown[]): T {
    for (const source of sources) {
        if (typeof source === 'object' && source !== null) {
            mergeInto(target, source);
        }
    }
    return target;
}
