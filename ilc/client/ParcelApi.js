import debug from 'debug';
import {flattenFnArray} from './utils';
import {Intl as IlcIntl} from 'ilc-sdk/app';

export default class ParcelApi {
    #registryConf;
    #bundleLoader;
    #getAppSdkAdapter;
    #debug;

    constructor(registryConf, bundleLoader, getAppSdkAdapter) {
        this.#registryConf = registryConf;
        this.#bundleLoader = bundleLoader;
        this.#getAppSdkAdapter = getAppSdkAdapter;
        this.#debug = debug('ILC:ParcelApi');
    }

    importParcelFromApp = async (appName, parcelName) => {
        const app = this.#registryConf.apps[appName];
        if (!app) {
            throw new Error(`Unable to find requested app "${appName}" in Registry`);
        }

        const appBundle = await this.#bundleLoader.loadApp(appName);

        if (!appBundle.parcels || !appBundle.parcels[parcelName]) {
            throw new Error(`Looks like application "${appName}" doesn't export requested parcel: ${parcelName}`);
        }

        let parcelCallbacks = appBundle.parcels[parcelName];

        let intlInstances = {};
        return this.#propsInjector(parcelCallbacks, (props, lifecycleType) => {
            let intlForUnmount;
            if (lifecycleType === 'unmount') {
                intlForUnmount = intlInstances[props.name];
                delete intlInstances[props.name]; // We delete reference on unmount to cleanup memory

                if (intlForUnmount) {
                    intlForUnmount.unmount();
                }
            } else if (!intlInstances[props.name]) {
                const adapter = this.#getAppSdkAdapter(props.name);
                intlInstances[props.name] = new IlcIntl(props.name, adapter.intl);
            }


            const resultingProps = {
                ...props,
                parcelSdk: {
                    parcelId: props.name,
                    registryProps: app.props,
                    intl: intlInstances[props.name] || intlForUnmount,
                },
            };

            this.#debug(`${lifecycleType.toUpperCase()} for parcel "${parcelName}" from app "${appName}" with: `, resultingProps);

            return resultingProps;
        });
    };

    #propsInjector = (callbacks, modifyPropsCb) => {
        const resCallbacks = {};
        for (let lifecycle in callbacks) {
            if (!callbacks.hasOwnProperty(lifecycle)) {
                continue;
            }

            const callback = flattenFnArray(callbacks, lifecycle);
            resCallbacks[lifecycle] = (props) => callback(modifyPropsCb(props, lifecycle));
        }

        return resCallbacks;
    }
}
