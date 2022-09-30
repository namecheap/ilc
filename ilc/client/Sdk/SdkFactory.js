import { SdkOptions } from '../../common/SdkOptions';
import IlcAppSdk from 'ilc-sdk/app';
import { SdkAdapterFactory } from './SdkAdapterFactory';

export class SdkFactory {

    #configRoot;
    #sdkAdapterFactory

    constructor(configRoot, i18n, router) {
        this.#configRoot = configRoot;
        this.#sdkAdapterFactory = new SdkAdapterFactory(i18n, router);
    }

    getSdkInstanceFactoryByApplicationName(applicationName) {
        const {  l10nManifest} = this.#configRoot.getConfigForAppByName(applicationName);
        const sdkOptions = new SdkOptions( {
            i18n: {
                manifestPath: l10nManifest,
            },
        });

        return (applicationId) => {
            return new IlcAppSdk(this.getSdkAdapterInstance(applicationId), sdkOptions.toJSON());
        }
    }

    getSdkAdapterInstance(applicationId) {
        return this.#sdkAdapterFactory.getSdkAdapter(applicationId);
    }
}
