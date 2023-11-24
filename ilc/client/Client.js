import * as singleSpa from 'single-spa';

import { PluginManager } from 'ilc-plugins-sdk/browser';

import { PluginsLoader } from './PluginsLoader';
import UrlProcessor from '../common/UrlProcessor';
import { appIdToNameAndSlot, removeQueryParams, addTrailingSlashToPath } from '../common/utils';

import { setNavigationErrorHandler, addNavigationHook } from './navigationEvents/setupEvents';

import {
    CorsError,
    RuntimeError,
    InternalError,
    NavigationError,
    FragmentError,
    CriticalFragmentError,
    CriticalInternalError,
} from './errors';

import { triggerAppChange } from './navigationEvents';

import registryService from './registry/factory';

import Router from './ClientRouter';
import initIlcState from './initIlcState';
import I18n from './i18n';

import GuardManager from './GuardManager';
import ParcelApi from './ParcelApi';
import { BundleLoader } from './BundleLoader';
import registerSpaApps from './registerSpaApps';
import { TransitionManager } from './TransitionManager/TransitionManager';
import IlcEvents from './constants/ilcEvents';
import singleSpaEvents from './constants/singleSpaEvents';
import ErrorHandlerManager from './ErrorHandlerManager/ErrorHandlerManager';

import { FRAGMENT_KIND } from '../common/constants';
import { SdkFactoryBuilder } from './Sdk/SdkFactoryBuilder';
import { TransitionHooks } from './TransitionManager/TransitionHooks/TransitionHooks';
import { PerformanceTransitionHook } from './TransitionManager/TransitionHooks/PerformanceTransitionHook';
import { TitleCheckerTransitionHook } from './TransitionManager/TransitionHooks/TitleCheckerTransitionHook';
import { HrefLangHandler } from './HrefLangHandler';
import { CanonicalTagHandler } from './CanonicalTagHandler';

export class Client {
    #configRoot;

    #moduleLoader;

    #logger;

    #registryService;

    #errorHandlerManager;

    #transitionManager;

    #pluginManager;

    #i18n;

    #router;

    #guardManager;

    #urlProcessor;

    #bundleLoader;

    #sdkFactoryBuilder;

    constructor(config) {
        this.#configRoot = config;
        this.#registryService = registryService;

        const pluginsLoader = new PluginsLoader();
        this.#pluginManager = new PluginManager(...pluginsLoader.load());
        const reportingPlugin = this.#pluginManager.getReportingPlugin();
        reportingPlugin.setConfig(this.#configRoot);

        this.#logger = reportingPlugin.logger;

        this.#errorHandlerManager = new ErrorHandlerManager(this.#logger, this.#registryService);

        const transitionTimeout = 60000;

        this.#transitionManager = new TransitionManager(
            this.#logger,
            this.#configRoot.getSettingsByKey('globalSpinner'),
            this.#errorHandlerManager,
            transitionTimeout,
        );

        const i18nSettings = this.#configRoot.getSettingsByKey('i18n');

        if (i18nSettings.enabled) {
            this.#i18n = new I18n(
                i18nSettings,
                {
                    ...singleSpa,
                    triggerAppChange,
                },
                this.#errorHandlerFor.bind(this),
                this.#transitionManager,
            );
        }

        const ilcState = initIlcState();
        this.#router = new Router(
            this.#configRoot,
            ilcState,
            this.#i18n,
            singleSpa,
            this.#transitionManager.handlePageTransition.bind(this.#transitionManager),
        );
        this.#guardManager = new GuardManager(
            this.#router,
            this.#pluginManager,
            this.#onCriticalInternalError.bind(this),
        );
        this.#urlProcessor = new UrlProcessor(this.#configRoot.getSettingsByKey('trailingSlash'));

        this.#moduleLoader = this.#getModuleLoader();
        this.#sdkFactoryBuilder = new SdkFactoryBuilder(this.#configRoot, this.#i18n, this.#router);
        this.#bundleLoader = new BundleLoader(this.#configRoot, this.#moduleLoader, this.#sdkFactoryBuilder);

        const hrefLangHandler = new HrefLangHandler(this.#configRoot.getSettingsByKey('i18n'), this.#logger);
        hrefLangHandler.start();

        const canonicalTagHandler = new CanonicalTagHandler(this.#i18n, this.#logger);
        canonicalTagHandler.start();

        this.#preheat();
        this.#expose();
        this.#configure();
    }

    #preheat() {
        // Initializing 500 error page to cache template of this page
        // to avoid a situation when localhost can't return this template in future
        this.#registryService
            .preheat()
            .then(() => this.#logger.info('ILC: Registry service preheated successfully'))
            .catch((error) => {
                const preheatError = new InternalError({
                    cause: error,
                    message: 'Failed to preheat registry service',
                });

                this.#errorHandlerManager.handleError(preheatError);
            });
    }

    #getModuleLoader() {
        if (window.System === undefined) {
            const error = new Error("ILC: can't find SystemJS on a page, crashing everything");
            this.#onCriticalInternalError(error);

            throw error;
        }

        return window.System;
    }

    #errorHandlerFor(appName, slotName) {
        return (error, errorInfo) => {
            let isCriticalError = false;
            const isAppExists = !!this.#configRoot.getConfigForAppByName(appName);

            if (!isAppExists) {
                isCriticalError = true;
            } else {
                try {
                    const fragmentKind = this.#router.getRelevantAppKind(appName, slotName);

                    isCriticalError = [FRAGMENT_KIND.primary, FRAGMENT_KIND.essential].includes(fragmentKind);
                } catch (error) {
                    isCriticalError = true;
                }
            }

            const errorParams = {
                cause: error,
                message: error.message,
                data: {
                    ...errorInfo,
                    name: appName,
                    slotName,
                },
            };

            const fragmentError = isCriticalError
                ? new CriticalFragmentError(errorParams)
                : new FragmentError(errorParams);
            this.#errorHandlerManager.handleError(fragmentError);
        };
    }

    #onNavigationError(error, errorInfo) {
        const navigationError = new NavigationError({
            message: error.message,
            data: errorInfo,
            cause: error,
        });

        this.#errorHandlerManager.handleError(navigationError);
    }

    #onCriticalInternalError(error, errorInfo) {
        const criticalError = new CriticalInternalError({
            message: error.message,
            data: errorInfo,
            cause: error,
        });

        this.#errorHandlerManager.handleError(criticalError);
    }

    #isCorsError(event) {
        const { error, colno, lineno } = event;

        return !error && lineno === 0 && colno === 0;
    }

    #onRuntimeError(event) {
        let { error } = event;

        if (this.#isCorsError(event)) {
            error = new CorsError({
                message: event.message,
            });
        } else {
            event.preventDefault();
        }

        const { filename: fileName } = event;
        let moduleInfo = this.#moduleLoader.getModuleInfo(fileName);

        if (moduleInfo === null) {
            moduleInfo = {
                name: 'UNKNOWN_MODULE',
                dependants: [],
            };
        }

        const runtimeError = new RuntimeError({
            message: error.message,
            cause: error,
            data: {
                ...moduleInfo,
                location: {
                    fileName,
                    colNo: event.colno,
                    lineNo: event.lineno,
                },
            },
        });

        this.#errorHandlerManager.handleError(runtimeError);
    }

    #onLifecycleError(error) {
        const { appName, slotName } = appIdToNameAndSlot(error.appOrParcelName);
        this.#transitionManager.reportSlotRenderingError(slotName);

        this.#errorHandlerFor(appName, slotName)(error);
    }

    #configure() {
        addNavigationHook((url) => (this.#guardManager.hasAccessTo(url) ? url : null));
        addNavigationHook((url) => this.#urlProcessor.process(url));

        // TODO: window.ILC.importLibrary - calls bootstrap function with props (if supported), and returns exposed API
        // TODO: window.ILC.importParcelFromLibrary - same as importParcelFromApp, but for libs
        registerSpaApps(
            this.#configRoot,
            this.#router,
            this.#errorHandlerFor.bind(this),
            this.#bundleLoader,
            this.#transitionManager,
            this.#sdkFactoryBuilder,
            this.#errorHandlerManager,
        );

        setNavigationErrorHandler(this.#onNavigationError.bind(this));
        window.addEventListener('error', this.#onRuntimeError.bind(this));

        const transitionHook = new TransitionHooks(this.#logger);
        const performanceHook = new PerformanceTransitionHook(this.#router.getCurrentRoute, this.#logger);
        const titleHook = new TitleCheckerTransitionHook(this.#router.getCurrentRoute, this.#logger);

        transitionHook.addHook(performanceHook);
        transitionHook.addHook(titleHook);
        transitionHook.subscribe();

        singleSpa.addErrorHandler(this.#onLifecycleError.bind(this));
        singleSpa.setBootstrapMaxTime(5000, false);
        singleSpa.setMountMaxTime(5000, false);
        singleSpa.setUnmountMaxTime(3000, false);
        singleSpa.setUnloadMaxTime(3000, false);
    }

    #addIntlChangeHandler(handler) {
        if (typeof handler !== 'function') {
            throw new Error('onIntlChange should pass function handler as first argument');
        }

        window.addEventListener(IlcEvents.INTL_UPDATE, (event) => {
            const intlValues = {
                locale: event.detail.locale,
                currency: event.detail.currency,
            };

            handler(intlValues);
        });
    }

    #addRouteChangeHandlerWithDispatch(handler) {
        if (typeof handler !== 'function') {
            throw new Error('onRouteChange should pass function handler as first argument');
        }

        window.addEventListener(singleSpaEvents.ROUTING_EVENT, (event) => {
            const route = this.#router.getCurrentRoute();
            const ilcEvent = new CustomEvent('ilc:onRouteChange', {
                detail: {
                    basePath: route.basePath,
                    reqUrl: route.reqUrl,
                },
            });
            handler(event, ilcEvent);
        });

        return () => window.removeEventListener(singleSpaEvents.ROUTING_EVENT, handler);
    }

    #matchCurrentRoute(url) {
        const currentRoute = this.#router.getCurrentRoute();
        let currentUrl = currentRoute.reqUrl;

        // add trailing slash to urls if it's missing
        currentUrl = addTrailingSlashToPath(currentUrl);
        url = addTrailingSlashToPath(url);

        return currentUrl === url;
    }

    #expose() {
        // Here we expose window.ILC.define also as window.define to ensure that regular AMD/UMD bundles work correctly by default
        // See docs/umd_bundles_compatibility.md
        if (!this.#configRoot.getConfig().settings.amdDefineCompatibilityMode) {
            window.define = window.ILC.define;
        }

        const parcelApi = new ParcelApi(
            this.#configRoot.getConfig(),
            this.#bundleLoader,
            this.#sdkFactoryBuilder.getSdkAdapterInstance.bind(this.#sdkFactoryBuilder),
        );

        Object.assign(window.ILC, {
            loadApp: this.#bundleLoader.loadApp.bind(this.#bundleLoader),
            navigate: this.#router.navigateToUrl.bind(this.#router),
            onIntlChange: this.#addIntlChangeHandler.bind(this),
            onRouteChange: this.#addRouteChangeHandlerWithDispatch.bind(this),
            matchCurrentRoute: this.#matchCurrentRoute.bind(this),
            mountRootParcel: singleSpa.mountRootParcel.bind(singleSpa),
            importParcelFromApp: parcelApi.importParcelFromApp.bind(this),
            getIntlAdapter: () => (this.#i18n ? this.#i18n.getAdapter() : null),
            getAllSharedLibNames: () => Promise.resolve(Object.keys(this.#configRoot.getConfig().sharedLibs)),
            getSharedLibConfigByName: (name) => {
                return Promise.resolve(this.#configRoot.getConfigForSharedLibsByName(name));
            },
            getApplicationConfigByName: (name) => {
                return Promise.resolve(this.#configRoot.getConfigForAppByName(name));
            },
            getSharedLibConfigByNameSync: (name) => {
                return this.#configRoot.getConfigForSharedLibsByName(name);
            },
            // @Deprecated
            // This method was designed to allow to create an app w/o singleSPA invocation (Case for dynamically loaded application)
            // It leads to situation when fragment creates dependency to ilc-sdk
            // Ilc has ilc-sdk dependency as well
            // So we are not protected from deps version mismatch :(
            // To solve it we created SdkFactoryBuilder that allow to create AppSdk instances and passing it to the app
            // So global 'getAppSdkAdapter' has no sence any more. We will remove it in next major release.
            getAppSdkAdapter: this.#sdkFactoryBuilder.getSdkAdapterInstance.bind(this.#sdkFactoryBuilder),
        });
    }

    start() {
        singleSpa.start({ urlRerouteOnly: true });
    }
}
