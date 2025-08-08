/**
 * Sets a value on an object at the specified nested key path.
 * Creates nested objects as needed if they don't exist.
 *
 * @param obj - The object to set the value on
 * @param key - The dot-separated key path (e.g., "user.profile.name")
 * @param value - The value to set at the key path
 * @throws {Error} When key contains empty segments
 *
 * @example
 * const obj = {};
 * set(obj, "user.profile.name", "John");
 * // obj is now { user: { profile: { name: "John" } } }
 */
export function set(obj: Record<string, unknown>, key: string, value: unknown): void {
    const keys = key.split('.');
    let currentObj: Record<string, unknown> = obj;

    for (let i = 0; i < keys.length - 1; i += 1) {
        const currentKey = keys[i];

        if (!currentKey) {
            throw new Error('Invalid key: empty key segment');
        }

        if (!(currentKey in currentObj)) {
            currentObj[currentKey] = {};
        }

        currentObj = currentObj[currentKey] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    if (!lastKey) {
        throw new Error('Invalid key: empty key segment');
    }
    currentObj[lastKey] = value;
}
