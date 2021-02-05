import {
    setNavigationErrorHandler,
    addNavigationHook,
} from './client/navigationEvents/setupEvents';
import * as singleSpa from 'single-spa';

import Router from './client/ClientRouter';
import setupErrorHandlers from './client/errorHandler/setupErrorHandlers';
import fragmentErrorHandlerFactory from './client/errorHandler/fragmentErrorHandlerFactory';
import internalErrorHandler from './client/errorHandler/internalErrorHandler';
import getIlcConfig from './client/ilcConfig';
import initIlcState from './client/initIlcState';
import setupPerformanceMonitoring from './client/performance';
import I18n from './client/i18n';
import UrlProcessor from './common/UrlProcessor';
import PluginManager from './common/PluginManager';
import {triggerAppChange} from './client/navigationEvents';
import GuardManager from './client/GuardManager';

import registerSpaApps from './client/registerSpaApps';

const registryConf = getIlcConfig();
const state = initIlcState();

const appErrorHandlerFactory = (appName, slotName) => {
    return fragmentErrorHandlerFactory(registryConf, router.getCurrentRoute, appName, slotName);
};

const pluginManager = new PluginManager(require.context('./node_modules', true, /ilc-plugin-.*\/browser\.js$/));
const i18n = registryConf.settings.i18n.enabled
    ? new I18n(registryConf.settings.i18n, {...singleSpa, triggerAppChange}, appErrorHandlerFactory)
    : null;
const router = new Router(registryConf, state, i18n ? i18n : undefined, singleSpa);
const guardManager = new GuardManager(router, pluginManager, internalErrorHandler);
const urlProcessor = new UrlProcessor(registryConf.settings.trailingSlash);

addNavigationHook((state) => ({
    navigationShouldBeCanceled: !guardManager.hasAccessTo(state.nextUrl),
    nextUrl: urlProcessor.process(state.nextUrl),
}));

// Here we expose window.ILC.define also as window.define to ensure that regular AMD/UMD bundles work correctly by default
// See docs/umd_bundles_compatibility.md
if (!registryConf.settings.amdDefineCompatibilityMode) {
    window.define = window.ILC.define;
}

window.ILC.getAppSdkAdapter = appId => ({
    appId,
    intl: i18n ? i18n.getAdapter() : null
});

registerSpaApps(registryConf, router, appErrorHandlerFactory);
setupErrorHandlers(registryConf, router.getCurrentRoute, setNavigationErrorHandler);
setupPerformanceMonitoring(router.getCurrentRoute);

singleSpa.setBootstrapMaxTime(5000, false);
singleSpa.setMountMaxTime(5000, false);
singleSpa.setUnmountMaxTime(3000, false);
singleSpa.setUnloadMaxTime(3000, false);

singleSpa.start({urlRerouteOnly: true});
