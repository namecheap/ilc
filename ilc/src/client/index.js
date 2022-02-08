import {
    setNavigationErrorHandler,
    addNavigationHook,
} from './navigationEvents/setupEvents';

import * as singleSpa from 'single-spa';

import {
    PluginManager,
} from 'ilc-plugins-sdk/browser';

import Router from './ClientRouter';
import setupErrorHandlers from './errorHandler/setupErrorHandlers';
import fragmentErrorHandlerFactory from './errorHandler/fragmentErrorHandlerFactory';
import internalErrorHandler from './errorHandler/internalErrorHandler';
import getIlcConfig from './ilcConfig';
import initIlcState from './initIlcState';
import setupPerformanceMonitoring from './performance';
import I18n from './i18n';
import UrlProcessor from '../common/UrlProcessor';
import {triggerAppChange} from './navigationEvents';
import GuardManager from './GuardManager';
import ParcelApi from './ParcelApi';
import bundleLoaderFactory from './BundleLoader';
import registerSpaApps from './registerSpaApps';
import transactionManagerFactory from './TransactionManager/TransactionManager';

const registryConf = getIlcConfig();
const state = initIlcState();
const transactionManager = transactionManagerFactory();

const appErrorHandlerFactory = (appName, slotName) => {
    return fragmentErrorHandlerFactory(registryConf, router.getRelevantAppKind.bind(router), appName, slotName);
};

const pluginManager = new PluginManager(require.context('../../node_modules', true, /ilc-plugin-[^/]+\/browser\.js$/));
const i18n = registryConf.settings.i18n.enabled
    ? new I18n(registryConf.settings.i18n, {...singleSpa, triggerAppChange}, appErrorHandlerFactory)
    : null;
const router = new Router(registryConf, state, i18n ? i18n : undefined, singleSpa, transactionManager.handlePageTransaction);
const guardManager = new GuardManager(router, pluginManager, internalErrorHandler);
const urlProcessor = new UrlProcessor(registryConf.settings.trailingSlash);
const bundleLoader = bundleLoaderFactory(registryConf);

addNavigationHook((url) => guardManager.hasAccessTo(url) ? url : null);
addNavigationHook((url) => urlProcessor.process(url));

// Here we expose window.ILC.define also as window.define to ensure that regular AMD/UMD bundles work correctly by default
// See docs/umd_bundles_compatibility.md
if (!registryConf.settings.amdDefineCompatibilityMode) {
    window.define = window.ILC.define;
}

/**
 * @param appId
 * @return ilc-sdk/app/AppSdkAdapter
 */
window.ILC.getAppSdkAdapter = appId => ({
    appId,
    intl: i18n ? i18n.getAdapter() : null,
    trigger404Page: (withCustomContent) => {
        if (withCustomContent) {
            return;
        }

        router.render404({
            detail: { appId },
        });
    },
});
window.ILC.navigate = router.navigateToUrl.bind(router);

const parcelApi = new ParcelApi(registryConf, bundleLoader, window.ILC.getAppSdkAdapter);
window.ILC.mountRootParcel = singleSpa.mountRootParcel;
window.ILC.loadApp = bundleLoader.loadAppWithCss.bind(bundleLoader); // Internal API for Namecheap, not for public use
window.ILC.importParcelFromApp = parcelApi.importParcelFromApp;
window.ILC.getAllSharedLibNames = async () => Object.keys(registryConf.sharedLibs);
// TODO: window.ILC.importLibrary - calls bootstrap function with props (if supported), and returns exposed API
// TODO: window.ILC.importParcelFromLibrary - same as importParcelFromApp, but for libs

registerSpaApps(registryConf, router, appErrorHandlerFactory, bundleLoader);
setupErrorHandlers(registryConf, router.getRelevantAppKind.bind(router), setNavigationErrorHandler, transactionManager);
setupPerformanceMonitoring(router.getCurrentRoute);

singleSpa.setBootstrapMaxTime(5000, false);
singleSpa.setMountMaxTime(5000, false);
singleSpa.setUnmountMaxTime(3000, false);
singleSpa.setUnloadMaxTime(3000, false);

singleSpa.start({urlRerouteOnly: true});
