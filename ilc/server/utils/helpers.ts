export function setErrorData(error: Error, data: Record<string, string | number | boolean>): void {
    if ('data' in error && typeof error.data === 'object' && error.data !== null) {
        Object.assign(error.data, data);
    } else {
        // Check if the property exists and is non-configurable (like extended errors)
        const descriptor = Object.getOwnPropertyDescriptor(error, 'data');
        if (descriptor && !descriptor.configurable) {
            return;
        }

        try {
            Object.defineProperty(error, 'data', { enumerable: true, writable: false, value: data });
        } catch (e) {
            // If property already exists and is not configurable, skip setting it
            // This handles cases where the property might be defined on the prototype
        }
    }
}
