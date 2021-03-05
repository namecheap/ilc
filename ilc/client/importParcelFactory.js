import {flattenFnArray} from "./utils";

export default (registryConf, bundleLoader) => async (appName, parcelName) => {
    const app = registryConf.apps[appName];
    if (!app) {
        throw new Error(`Unable to find requested app "${appName}" in Registry`);
    }

    const appBundle = await bundleLoader.loadApp(appName);

    if (!appBundle.parcels || !appBundle.parcels[parcelName]) {
        throw new Error(`Looks like application "${appName}" doesn't export requested parcel: ${parcelName}`);
    }

    const parcelCallbacks = appBundle.parcels[parcelName];


    return propsInjector(parcelCallbacks, {
        test: 1
    });
};

function propsInjector(callbacks, extraProps) {
    for (let lifecycle in callbacks) {
        if (!callbacks.hasOwnProperty(lifecycle)) {
            continue;
        }

        const callback = flattenFnArray(callbacks, lifecycle);
        callbacks[lifecycle] = (props) => callback({...props, ...extraProps});
    }

    return callbacks;
}
