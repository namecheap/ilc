/**
 * Normalizes a value to an array, if it is not already an array.
 *
 * normalizeArray('foo') -> ['foo']
 * normalizeArray(['foo']) -> ['foo']
 * normalizeArray(5) -> [5]
 * normalizeArray(null) -> [null]
 * normalizeArray(undefined) -> undefined
 */
export function normalizeArray<T>(value: T): T extends undefined ? undefined : T extends any[] ? T : T[];
export function normalizeArray(value: any): any {
    if (value === undefined) {
        return undefined;
    } else if (Array.isArray(value)) {
        return value;
    } else {
        return [value];
    }
}
