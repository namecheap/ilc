export function omit<T extends object, K extends PropertyKey>(value: T, keys: K | K[]): Omit<T, K> {
    const omitted: PropertyKey[] = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(Object.entries(value).filter(([key]) => !omitted.includes(key))) as Omit<T, K>;
}
