import * as singleSpa from 'single-spa';

import {
    PluginManager,
} from 'ilc-plugins-sdk/browser';

import UrlProcessor from '../common/UrlProcessor';
import { appIdToNameAndSlot } from '../common/utils';

import {
    setNavigationErrorHandler,
    addNavigationHook,
} from './navigationEvents/setupEvents';

import { triggerAppChange } from './navigationEvents';
import navigationErrors from './navigationEvents/errors';

import registryService from './registry/factory';

import Router from './ClientRouter';
import initIlcState from './initIlcState';
import setupPerformanceMonitoring from './performance';
import I18n from './i18n';

import GuardManager from './GuardManager';
import ParcelApi from './ParcelApi';
import bundleLoaderFactory from './BundleLoader';
import registerSpaApps from './registerSpaApps';
import { TransitionManager } from './TransitionManager/TransitionManager';
import IlcEvents from './constants/ilcEvents';
import ErrorHandlerManager from './ErrorHandlerManager/ErrorHandlerManager';

export class Client {
    #configRoot;

    #logger;
   
    #errorHandlerManager;

    #transitionManager;

    #pluginManager;

    #i18n;

    #router;

    #guardManager;

    #urlProcessor;

    #bundleLoader;

    constructor(config) {
        this.#configRoot = config;
        this.#logger = window.console;

        console.log('GLOBAL SPINNER =', this.#configRoot.getSettingsByKey('globalSpinner'));

        this.#errorHandlerManager = new ErrorHandlerManager(registryService);
        this.#transitionManager = new TransitionManager(this.#logger, this.#configRoot.getSettingsByKey('globalSpinner'));

        this.#pluginManager = new PluginManager(require.context('../node_modules', true, /ilc-plugin-[^/]+\/browser\.js$/));

        const i18nSettings = this.#configRoot.getSettingsByKey('i18n');

        if (i18nSettings.enabled) { 
            this.#i18n = new I18n(i18nSettings, {
                    ...singleSpa, 
                    triggerAppChange
                },
                this.#errorHandlerFor.bind(this), 
                this.#transitionManager
            );
        }

        const ilcState = initIlcState();
        this.#router = new Router(this.#configRoot, ilcState, this.#i18n, singleSpa, this.#transitionManager.handlePageTransaction);
        
        this.#guardManager = new GuardManager(this.#router, this.#pluginManager, this.#onInternalError.bind(this));
        this.#urlProcessor = new UrlProcessor(this.#configRoot.getSettingsByKey('trailingSlash'));
        this.#bundleLoader = bundleLoaderFactory(this.#configRoot.getConfig(), this.#onInternalError.bind(this));
    
        this.#expose();
        this.#configure();
    }

    #errorHandlerFor(appName, slotName) {
        if (!navigator.onLine) {
            return window.location.reload();
        }

        return (error, errorInfo) => {
            const fragmentKind = this.#router.getRelevantAppKind(appName, slotName);
            this.#errorHandlerManager.fragmentError({ appName, slotName, fragmentKind }, error, errorInfo);
        };
    }

    #onNavigationError(error, errorInfo) {
        const navigationError = new navigationErrors.NavigationError({
            data: errorInfo,
            cause: error,
        });

        this.#onInternalError(navigationError, errorInfo);
    }

    #onInternalError(error, errorInfo) {
        this.#errorHandlerManager.internalError(error, errorInfo);
    }

    #onRuntimeError(error, errorInfo) {
        this.#errorHandlerManager.runtimeError(error, errorInfo);
    }

    #onLifecycleError(error) {
        const { appName, slotName } = appIdToNameAndSlot(error.appOrParcelName);
        this.#transitionManager.reportSlotRenderingError(slotName);

        this.#errorHandlerFor(appName, slotName)(error);
    }

    #configure() {
        addNavigationHook((url) => this.#guardManager.hasAccessTo(url) ? url : null);
        addNavigationHook((url) => this.#urlProcessor.process(url));

        // TODO: window.ILC.importLibrary - calls bootstrap function with props (if supported), and returns exposed API
        // TODO: window.ILC.importParcelFromLibrary - same as importParcelFromApp, but for libs
        registerSpaApps(this.#configRoot, this.#router, this.#errorHandlerFor.bind(this), this.#bundleLoader);

        setNavigationErrorHandler(this.#onNavigationError.bind(this));
        window.addEventListener('error', this.#onRuntimeError.bind(this));

        setupPerformanceMonitoring(this.#router.getCurrentRoute);

        singleSpa.addErrorHandler(this.#onLifecycleError.bind(this));
        singleSpa.setBootstrapMaxTime(5000, false);
        singleSpa.setMountMaxTime(5000, false);
        singleSpa.setUnmountMaxTime(3000, false);
        singleSpa.setUnloadMaxTime(3000, false);
    }

    /**
    * @param appId
    * @return ilc-sdk/app/AppSdkAdapter
    */
    #getAppSdkAdapter(appId) {
        return {
            appId,
            intl: this.#i18n ? this.#i18n.getAdapter() : null,
            trigger404Page: (withCustomContent) => {
                if (withCustomContent) {
                    return;
                }

                this.#router.render404({
                    detail: { appId },
                });
            },
        };
    }

    #addIntlChangeHandler(handler) {
        if (typeof handler !== 'function') {
            throw new Error('onIntlChange should pass function handler as first argument');
        }

        window.addEventListener(IlcEvents.INTL_UPDATE, (event) => {
            const intlValues = {
                currency: event.detail.currency,
                locale: event.detail.locale,
            };

            handler(intlValues);
        });
    }

    #expose() {
        // Here we expose window.ILC.define also as window.define to ensure that regular AMD/UMD bundles work correctly by default
        // See docs/umd_bundles_compatibility.md
        if (!this.#configRoot.getConfig().settings.amdDefineCompatibilityMode) {
            window.define = window.ILC.define;
        }
        
        const parcelApi = new ParcelApi(this.#configRoot.getConfig(), this.#bundleLoader, this.#getAppSdkAdapter.bind(this));

        Object.assign(window.ILC, {
            loadApp: this.#bundleLoader.loadAppWithCss.bind(this.#bundleLoader), // Internal API for Namecheap, not for public use
            navigate: this.#router.navigateToUrl.bind(this.#router),
            onIntlChange: this.#addIntlChangeHandler.bind(this),
            mountRootParcel: singleSpa.mountRootParcel.bind(singleSpa),
            getAppSdkAdapter: this.#getAppSdkAdapter.bind(this),
            importParcelFromApp: parcelApi.importParcelFromApp.bind(this),
            getAllSharedLibNames: () => Promise.resolve(Object.keys(this.#configRoot.getConfig().sharedLibs)),
        });
    }

    start() {
        singleSpa.start({ urlRerouteOnly: true });
    }
}