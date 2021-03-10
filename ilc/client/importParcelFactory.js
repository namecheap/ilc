import {flattenFnArray} from './utils';
import {Intl as IlcIntl} from 'ilc-sdk/app';

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

    let intlInstances = {};

    return propsInjector(parcelCallbacks, (props, lifecycleType) => {
        let intlForUnmount;
        if (lifecycleType === 'unmount') {
            intlForUnmount = intlInstances[props.name];
            if (intlForUnmount) {
                intlForUnmount.unmount();
            }
            delete intlInstances[props.name];
        } else if (!intlInstances[props.name]) {
            const adapter = window.ILC.getAppSdkAdapter(props.name);
            intlInstances[props.name] = new IlcIntl(props.name, adapter.intl);
        }


        return {
            parcelSdk: {
                parcelId: props.name,
                registryProps: app.props,
                intl: intlInstances[props.name] || intlForUnmount,
            },
        };
    });
};

function propsInjector(callbacks, extraPropsCb) {
    for (let lifecycle in callbacks) {
        if (!callbacks.hasOwnProperty(lifecycle)) {
            continue;
        }

        const callback = flattenFnArray(callbacks, lifecycle);
        callbacks[lifecycle] = (props) => callback({...props, ...extraPropsCb(props, lifecycle)});
    }

    return callbacks;
}
