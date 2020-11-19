
import _ from 'lodash/fp';

/**
 * Original source code was taken from {@link https://github.com/prototypejs/prototype/blob/5fddd3e/src/prototype/lang/string.js#L702}
 */
const isJSON = (str) => {
    if (/^\s*$/.test(str)) return false;

    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');

    return (/^[\],:{}\s]*$/).test(str);
};

const parse = (value) => {
    if (_.isString(value) && isJSON(value)) {
        return JSON.parse(value);
    }

    return value;
}

export function parseJSON(value) {
    return _.cond([
        [_.isArray, _.map(_.mapValues(parseJSON))],
        [_.isObject, _.mapValues(parseJSON)],
        [_.stubTrue, parse]
    ])(value);
};
