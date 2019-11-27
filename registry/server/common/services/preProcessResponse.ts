import _ from 'lodash/fp';
import {
    parseJSON,
} from './json';

const omitEmptyValues = _.omitBy(_.cond([
    [_.isNull, _.stubTrue],
    [_.isNumber, _.stubFalse],
    [_.isBoolean, _.stubFalse],
    [_.isEmpty, _.stubTrue],
    [_.stubTrue, _.stubFalse]
]));

const omitPreResponseEmptyValues = _.cond([
    [_.isArray, _.map(omitEmptyValues)],
    [_.isObject, omitEmptyValues],
    [_.stubTrue, (value: any) => value]
]);

const preProcessResponse = _.compose(
    omitPreResponseEmptyValues,
    parseJSON,
);

export default preProcessResponse;
