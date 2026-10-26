export function omitNil<T extends object>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, item]) => item !== null && item !== undefined),
    ) as Partial<T>;
}
