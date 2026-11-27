/**
 * Original source code was taken from {@link https://github.com/prototypejs/prototype/blob/5fddd3e/src/prototype/lang/string.js#L702}
 */
function isJSON(str: string) {
    if (/^\s*$/.test(str)) return false;

    str = str.replace(/\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');

    return /^[\],:{}\s]*$/.test(str);
}

function parse(value: unknown): unknown {
    if (typeof value === 'string' && isJSON(value)) {
        return JSON.parse(value);
    }

    return value;
}

/**
 * Parses the JSON strings nested in a value, such as the stringified columns of a versioning snapshot.
 */
export function parseJSON(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(parseJSON);
    }
    if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, parseJSON(nested)]));
    }

    return parse(value);
}
