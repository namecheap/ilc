import * as singleSpa from 'single-spa';
import composeAppSlotPairsToRegister from './composeAppSlotPairsToRegister';
import { makeAppId, getSlotEntries } from '../common/utils';
import { getSlotElement, getAppContainer, prependSpaCallbacks } from './utils';
import WrapApp from './WrapApp';
import AsyncBootUp from './AsyncBootUp';
import ilcEvents from './constants/ilcEvents';

function getCustomProps(slot, router, appErrorHandlerFactory, sdkFactoryBuilder, ownContainer = false) {
    const appName = slot.getApplicationName();
    const appId = slot.getApplicationId();
    const slotName = slot.getSlotName();

    const sdkInstanceFactory = sdkFactoryBuilder.getSdkFactoryByApplicationName(appName);
    const appSdk = sdkInstanceFactory(appId);

    const customProps = {
        domElementGetter: () =>
            ownContainer
                ? getAppContainer(slotName, appId, slotAppIdsInOrder(router.getCurrentRoute(), slotName))
                : getSlotElement(slotName),
        getCurrentPathProps: () => {
            return router.getCurrentRouteProps(appName, slotName);
        },
        getCurrentBasePath: () => router.getCurrentBasePath(appName, slotName),
        appId, // Unique application ID, if same app will be rendered twice on a page - it will get different IDs
        errorHandler: appErrorHandlerFactory(appName, slotName),
        appSdk,
    };

    return customProps;
}

/**
 * A slot that lists several apps on any route gives every app of that slot its own container, on
 * every route: an app rendering straight into the slot element would wipe its neighbours.
 */
export function isMultiAppSlot(ilcConfigRoot, slotName) {
    const routes = [
        ...(ilcConfigRoot.getConfigForRoutes() || []),
        ...Object.values(ilcConfigRoot.getConfigForSpecialRoutes() || {}),
    ];

    return routes.some((route) => getSlotEntries(route.slots && route.slots[slotName]).length > 1);
}

/**
 * A slot in which some route keeps an app alive gives every app of that slot its own container, so a
 * hidden app and the visible app can coexist in it.
 */
export function isKeepAliveSlot(ilcConfigRoot, slotName) {
    const routes = [
        ...(ilcConfigRoot.getConfigForRoutes() || []),
        ...Object.values(ilcConfigRoot.getConfigForSpecialRoutes() || {}),
    ];

    return routes.some((route) =>
        getSlotEntries(route.slots && route.slots[slotName]).some((entry) => entry.keepAlive),
    );
}

/** app ids of a slot in the order the route lists them */
export function slotAppIdsInOrder(route, slotName) {
    const entries = route && route.slots ? getSlotEntries(route.slots[slotName]) : [];

    return entries.map((entry) => makeAppId(entry.appName, slotName));
}

export function registerApplications(
    ilcConfigRoot,
    router,
    appErrorHandlerFactory,
    bundleLoader,
    transitionManager,
    sdkFactoryBuilder,
    errorHandlerManager,
) {
    const asyncBootUp = new AsyncBootUp();
    const registryConf = ilcConfigRoot.getConfig();

    const appSlotsList = composeAppSlotPairsToRegister(ilcConfigRoot);

    appSlotsList.forEach((slot) => {
        const slotName = slot.getSlotName();
        const appName = slot.getApplicationName();
        const appId = slot.getApplicationId();

        let customProps;

        try {
            customProps = getCustomProps(
                slot,
                router,
                appErrorHandlerFactory,
                sdkFactoryBuilder,
                isMultiAppSlot(ilcConfigRoot, slotName) || isKeepAliveSlot(ilcConfigRoot, slotName),
            );
        } catch (error) {
            errorHandlerManager.handleError(error);
            // In case of runtime error we should not fail registration of SPA applications
            return;
        }

        const { appSdk } = customProps;

        let lifecycleMethods;
        const updateFragmentManually = () => {
            lifecycleMethods.update({
                ...customProps,
                name: appId,
            });
        };

        const isUpdatePropsMode = () => lifecycleMethods.update && registryConf.settings.onPropsUpdate === 'update';

        const onUnmount = async () => {
            if (isUpdatePropsMode()) {
                router.removeListener(ilcEvents.updateAppInSlot(slotName, appName), updateFragmentManually);
            }

            appSdk.unmount();
        };
        const onMount = async () => {
            if (isUpdatePropsMode()) {
                router.addListener(ilcEvents.updateAppInSlot(slotName, appName), updateFragmentManually);
            }

            try {
                // it's necessary to have unified behaviour for all apps when
                // we're missing slot for them to be mounted in template
                getSlotElement(slotName);
            } catch (e) {
                throw new Error(
                    `Failed to mount application "${appName}" to slot "${slotName}" due to absence of the slot in template!`,
                );
            }
        };

        const loadingFn = async () => {
            if (!slot.isValid()) {
                throw new Error(`Can not find application - ${appName}`);
            }

            const appConf = ilcConfigRoot.getConfigForAppByName(appName);

            let wrapperConf = null;
            if (appConf.wrappedWith) {
                wrapperConf = {
                    ...ilcConfigRoot.getConfigForAppByName(appConf.wrappedWith),
                    appId: makeAppId(appConf.wrappedWith, slotName),
                    ...{
                        wrappedAppConf: appConf,
                    },
                };
            }

            // Speculative preload of the JS bundle. We don't do it for CSS here as we already did it with preload links
            bundleLoader.preloadApp(appName);

            const overrides = await asyncBootUp.waitForSlot(slotName);
            // App wrapper was rendered at SSR instead of app
            if (wrapperConf !== null && overrides.wrapperPropsOverride === null) {
                wrapperConf.cssBundle = overrides.cssBundle ? overrides.cssBundle : wrapperConf.cssBundle;
            } else {
                appConf.cssBundle = overrides.cssBundle ? overrides.cssBundle : appConf.cssBundle;
            }

            const waitTill = [bundleLoader.loadAppWithCss(appName)];
            if (wrapperConf !== null) {
                waitTill.push(bundleLoader.loadAppWithCss(appConf.wrappedWith));
            }

            lifecycleMethods = await Promise.all(waitTill).then(([spaCallbacks, wrapperSpaCallbacks]) => {
                if (wrapperConf !== null) {
                    const wrapper = new WrapApp(wrapperConf, overrides.wrapperPropsOverride, transitionManager);

                    spaCallbacks = wrapper.wrapWith(spaCallbacks, wrapperSpaCallbacks);
                }

                return prependSpaCallbacks(spaCallbacks, [
                    { type: 'unmount', callback: onUnmount },
                    { type: 'mount', callback: onMount },
                ]);
            });

            return lifecycleMethods;
        };

        const activityFn = (location) => {
            return router.isAppWithinSlotActive(appName, slotName);
        };

        singleSpa.registerApplication(appId, loadingFn, activityFn, customProps);
    });

    return {
        destroy() {
            asyncBootUp.destroy();
            // TODO: change to unregisterApplication when single-spa is updated to 5.8+
            const registeredApps = singleSpa.getAppNames();
            return Promise.all(registeredApps.map((appName) => singleSpa.unloadApplication(appName)));
        },
    };
}
