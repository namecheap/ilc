import _ from 'lodash/fp';

import preProcessResponse from '../../common/services/preProcessResponse';

const preProcessSetting = _.flowRight((setting) => {
    const transformed = Object.assign({}, setting);

    if (transformed.value === undefined && transformed.default !== undefined) {
        transformed.value = transformed.default;
    }

    transformed.secret = !!transformed.secret;

    if (transformed.secret) {
        delete transformed.value;
        delete transformed.default;
    }

    return transformed;
}, preProcessResponse);

const preProcessSettingsResponse = _.cond([
    [_.isArray, _.map(preProcessSetting)],
    [_.isObject, preProcessSetting],
    [_.stubTrue, (value: any) => value],
]);

export default preProcessSettingsResponse;
