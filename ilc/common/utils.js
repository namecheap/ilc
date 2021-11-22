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

const encodeScriptTags = value => value.replace(/<script/g, '&lt;script').replace(/<\/script>/g, '&lt;%2F;script&gt;');
const decodeScriptTags = value => value.replace(/&lt;script/g, '<script').replace(/&lt;%2F;script&gt;/g, '</script>');

module.exports = {
    appIdToNameAndSlot,
    makeAppId,
    cloneDeep,
    uniqueArray,
    encodeScriptTags,
    decodeScriptTags,
}
