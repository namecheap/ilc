export function setErrorData(error: Error, data: Record<string, string | number | boolean>): void {
    if ('data' in error && typeof error.data === 'object' && error.data !== null) {
        Object.assign(error.data, data);
    } else {
        Object.defineProperty(error, 'data', { enumerable: true, writable: false, value: data });
    }
}
