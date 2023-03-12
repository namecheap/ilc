import _ from 'lodash/fp';

/**
 * Original source code was taken from {@link https://github.com/prototypejs/prototype/blob/5fddd3e/src/prototype/lang/string.js#L702}
 */
const isJSON = (str: string): boolean => {
    if (/^\s*$/.test(str)) return false;

    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');

    return /^[\],:{}\s]*$/.test(str);
};

const parse = (value: any): any => {
    if (_.isString(value) && isJSON(value)) {
        return JSON.parse(value);
    }

    return value;
};

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
        `Value ${value} is not correspond to object you define in type guard. Please you db entity and try to assert it to expected type correctly`,
    );
}

// Avoid using this type unsafe method and switch code to safeParseJSON
export function parseJSON(value: any): any {
    return _.cond([
        [_.isArray, _.map(_.mapValues(parseJSON))],
        [_.isObject, _.mapValues(parseJSON)],
        [_.stubTrue, parse],
    ])(value);
}

export const stringifyJSON = _.curry((pathes: string[], data: any) =>
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
