export default (registryConf, bundleLoader) => async (appName, parcelName) => {
    const app = registryConf.apps[appName];
    if (!app) {
        throw new Error(`Unable to find requested app "${appName}" in Registry`);
    }

    const appBundle = await bundleLoader.loadApp(appName);

    if (!appBundle.parcels || !appBundle.parcels[parcelName]) {
        throw new Error(`Looks like application "${appName}" doesn't export requested parcel: ${parcelName}`);
    }

    return appBundle.parcels[parcelName];
};
