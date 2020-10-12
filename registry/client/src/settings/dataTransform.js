export const keys = {
    trailingSlash: 'trailingSlash',
    baseUrl: 'baseUrl',
    authOpenIdEnabled: 'auth.openid.enabled',
    authOpenIdDiscoveryUrl: 'auth.openid.discoveryUrl',
    amdDefineCompatibilityMode: 'amdDefineCompatibilityMode',
};

export const choices = {
    [keys.trailingSlash]: [
        {id: 'doNothing', name: 'Do nothing'},
        {id: 'redirectToBaseUrl', name: 'Redirect to base URL'},
        {id: 'redirectToBaseUrlWithTrailingSlash', name: 'Redirect to base URL with trailing slash'},
    ],
};

export function transformGet(setting) {
    setting.id = setting.key;
    setting.secured = !!setting.secured;

    if (setting.value === undefined) {
        setting.value = null;
    }
}

export function transformSet(setting) {
    delete setting.id;

    if (setting.value === null) {
        setting.value = '';
    }
}
