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

module.exports = {
    appIdToNameAndSlot,
    makeAppId,
}
