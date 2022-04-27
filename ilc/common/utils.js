const deepmerge = require('deepmerge');

function appIdToNameAndSlot(appId) {
    const [appNameWithoutPrefix, slotName] = appId.split('__at__');

    // Case for shared libraries
    if (appNameWithoutPrefix === undefined || slotName === undefined) {
        return {
            appName: appId,
            slotName: 'none',
        };
    }

    return {
        appName: `@portal/${appNameWithoutPrefix}`,
        slotName,
    };
}

function makeAppId(appName, slotName) {
    return `${appName.replace('@portal/', '')}__at__${slotName}`;
}

function cloneDeep(source) {
    return deepmerge({}, source);
}

const uniqueArray = array => [...new Set(array)];

const encodeHtmlEntities = value => value.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decodeHtmlEntities = value => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

const fakeBaseInCasesWhereUrlIsRelative = 'http://hack';
const parseUrl = (url) => new URL(url, fakeBaseInCasesWhereUrlIsRelative);

module.exports = {
    appIdToNameAndSlot,
    makeAppId,
    cloneDeep,
    uniqueArray,
    encodeHtmlEntities,
    decodeHtmlEntities,
    parseUrl,
}
