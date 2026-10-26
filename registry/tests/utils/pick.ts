export function pick<T extends object, K extends keyof T>(value: T, keys: K[]): Pick<T, K> {
    return Object.fromEntries(keys.filter((key) => key in value).map((key) => [key, value[key]])) as Pick<T, K>;
}
