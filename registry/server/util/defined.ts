export function defined<T>(value: T | null | undefined): T {
    if (value === undefined || value === null) {
        throw new Error(`Expected value to be defined, but received ${value}`);
    }
    return value;
}
