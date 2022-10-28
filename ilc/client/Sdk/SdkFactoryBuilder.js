import { SdkOptions } from '../../common/SdkOptions';
import IlcAppSdk from 'ilc-sdk/app';
import { SdkAdapterFactory } from './SdkAdapterFactory';

export class SdkFactoryBuilder {

    #configRoot;
    #sdkAdapterFactory

    constructor(configRoot, i18n, router) {
        this.#configRoot = configRoot;
        this.#sdkAdapterFactory = new SdkAdapterFactory(i18n, router);
    }

    getSdkFactoryByApplicationName(applicationName) {
        const appConfig = this.#configRoot.getConfigForAppByName(applicationName);

        const manifestPath = appConfig?.l10nManifest;

        const sdkOptions = new SdkOptions( {
            i18n: {
                manifestPath,
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
