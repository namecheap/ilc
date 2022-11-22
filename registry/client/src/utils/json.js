
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

function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]';
}

export function isPlainObject(o) {
    var ctor,prot;

    if (isObject(o) === false) return false;

    // If has modified constructor
    ctor = o.constructor;
    if (ctor === undefined) return true;

    // If has modified prototype
    prot = ctor.prototype;
    if (isObject(prot) === false) return false;

    // If constructor does not have an Object-specific method
    if (prot.hasOwnProperty('isPrototypeOf') === false) {
        return false;
    }

    // Most likely a plain Object
    return true;
};
