import _ from 'lodash/fp';

/**
 * Original source code was taken from {@link https://github.com/prototypejs/prototype/blob/5fddd3e/src/prototype/lang/string.js#L702}
 */
const isJSON = (str: string): boolean => {
    if (/^\s*$/.test(str)) return false;

    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');

    return (/^[\],:{}\s]*$/).test(str);
};

const parseJSON = (value: any): any => {
    if (_.isString(value) && isJSON(value)) {
        return JSON.parse(value);
    }

    return value;
}

const omitEmptyValues = _.omitBy(_.cond([
    [_.isNull, _.stubTrue],
    [_.isEmpty, _.stubTrue],
    [_.stubTrue, _.stubFalse]
]));

const omitPreResponseEmptyValues = _.cond([
    [_.isArray, _.map(omitEmptyValues)],
    [_.isObject, omitEmptyValues],
    [_.stubTrue, (value: any) => value]
]);

const parsePreResponseJSON = _.cond([
    [_.isArray, _.map(_.mapValues(parseJSON))],
    [_.isObject, _.mapValues(parseJSON)],
    [_.stubTrue, parseJSON]
]);

const preProcessResponse = _.compose(
    omitPreResponseEmptyValues,
    parsePreResponseJSON,
);

export default preProcessResponse;
