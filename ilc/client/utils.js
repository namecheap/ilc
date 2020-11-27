export function getSlotElement(slotName) {
    const slot = document.getElementById(slotName);
    if (slot === null) {
        throw new Error(`Can't find slot element on the page`);
    }
    const appContainer = slot.querySelector('.app-container');

    return appContainer || slot;
}

export function getAppSpaCallbacks(appBundle, props = {}) {
    const mainSpa = appBundle.mainSpa || appBundle.default && appBundle.default.mainSpa;

    if (mainSpa !== undefined) {
        return mainSpa(props);
    } else {
        return appBundle;
    }
}

export function prependSpaCallback(spaCallbacks, type, callback) {
    const res = {
        bootstrap: spaCallbacks.bootstrap,
        mount: spaCallbacks.mount,
        unmount: spaCallbacks.unmount,
        unload: spaCallbacks.unload,
    };

    let orig = spaCallbacks[type];
    if (Array.isArray(orig)) {
        res[type] = [callback].concat(orig);
    } else {
        res[type] = [callback, orig];
    }

    return res;
}

export function appIdToNameAndSlot(appId) {
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
