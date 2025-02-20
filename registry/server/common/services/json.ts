import _ from 'lodash/fp';

/**
 * Original source code was taken from {@link https://github.com/prototypejs/prototype/blob/5fddd3e/src/prototype/lang/string.js#L702}
 */
export function isJSON(str: string): boolean {
    if (/^\s*$/.test(str)) return false;

    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');

    return /^[\],:{}\s]*$/.test(str);
}

export function parse<T = any>(value: unknown): T {
    if (typeof value === 'string' && isJSON(value) && !isNumeric(value)) {
        return JSON.parse(value);
    }

    return value as T;
}

export function isNumeric(str: unknown): boolean {
    if (typeof str !== 'string') return false;
    return !isNaN(str as unknown as number) && !isNaN(parseFloat(str));
}

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

interface JSONObject {
    [key: string]: JSONValue;
}
interface JSONArray extends Array<JSONValue> {}

const tryParseStringToJSON = (str: string): JSONValue => {
    try {
        return JSON.parse(str);
    } catch (error) {
        return str;
    }
};

type typeGuardFn = (value: JSONValue) => boolean;

export function safeParseJSON<T extends JSONValue>(value: unknown, typeGuard: typeGuardFn): T {
    let parsedValue;

    if (Array.isArray(value)) {
        parsedValue = value.map(parseJSON);
    } else if (typeof value === 'object' && value !== null) {
        parsedValue = Object.fromEntries(Object.entries(value).map(([key, val]) => [key, parseJSON(val)]));
    } else if (typeof value === 'string') {
        parsedValue = tryParseStringToJSON(value);
    } else {
        // value as string is assertion but it is allow to parse null, number, boolean, undefined w/o additional code
        parsedValue = JSON.parse(value as string);
    }

    if (typeGuard(parsedValue)) {
        return parsedValue;
    }

    throw new Error(
        `Value ${JSON.stringify(
            value,
        )} is not correspond to object you define in type guard. Please you db entity and try to assert it to expected type correctly`,
    );
}

// Avoid using this type unsafe method and switch code to safeParseJSON
export function parseJSON<T extends JSONValue>(value: unknown): T {
    if (Array.isArray(value)) {
        return value.map(parseJSON) as T;
    } else if (typeof value === 'object' && !!value) {
        return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, parseJSON(value)])) as T;
    } else {
        return parse(value);
    }
}

interface StringifyJSON {
    <T extends object, K extends keyof T>(
        keys: K[],
        obj: T,
    ): Omit<T, K> & {
        [P in K]: string;
    };
    <K extends string>(
        keys: K[],
    ): <T extends object>(
        obj: T,
    ) => Omit<T, K> & {
        [P in K]: string;
    };
}
export const stringifyJSON: StringifyJSON = _.curry((pathes: string[], data: any) =>
    _.reduce(
        (stringifiedData: any, path: string) =>
            _.cond([
                [
                    _.has(path),
                    () =>
                        _.set(
                            path,
                            _.get(path, data) !== null ? JSON.stringify(_.get(path, data)) : null,
                            stringifiedData,
                        ),
                ],
                [_.stubTrue, () => stringifiedData],
            ])(data),
        data,
        pathes,
    ),
);
