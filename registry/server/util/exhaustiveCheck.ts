export function exhaustiveCheck(value: never): never {
    throw new Error(`Unexpected value: ${value}`);
}
