import IlcAppSdk from 'ilc-sdk/app';
import * as singleSpa from 'single-spa';

import composeAppSlotPairsToRegister from './composeAppSlotPairsToRegister';
import {makeAppId} from '../common/utils';
import {getAppSpaCallbacks, getSlotElement, prependSpaCallback} from './utils';
import WrapApp from './WrapApp';
import isActiveFactory from './isActiveFactory';
import AsyncBootUp from './AsyncBootUp';
import {crashIlc} from "./errorHandler/fragmentErrorHandlerFactory";

let System;

export default function (registryConf, router, appErrorHandlerFactory) {
    System = window.System;
    if (System === undefined) {
        crashIlc();
        throw new Error('ILC: can\'t find SystemJS on a page, crashing everything');
    }

    const asyncBootUp = new AsyncBootUp();

    composeAppSlotPairsToRegister(registryConf).forEach(pair => {
        const slotName = pair.slotName;
        const appName = pair.appName;
        const appId = pair.appId;

        const appSdk = new IlcAppSdk(window.ILC.getAppSdkAdapter(appId));
        const onUnmount = async () => appSdk.unmount();

        singleSpa.registerApplication(
            appId,
            async () => {
                const appConf = registryConf.apps[appName];
                let wrapperConf = null;
                if (appConf.wrappedWith) {
                    wrapperConf = {
                        ...registryConf.apps[appConf.wrappedWith],
                        appId: makeAppId(appConf.wrappedWith, slotName),
                    }
                }

                // Speculative preload of the JS bundle. We don't do it for CSS here as we already did it with preload links
                System.import(appConf.spaBundle);
                if (wrapperConf !== null) {
                    System.import(wrapperConf.spaBundle);
                }

                const overrides = await asyncBootUp.waitForSlot(slotName);
                // App wrapper was rendered at SSR instead of app
                if (wrapperConf !== null && overrides.wrapperPropsOverride === null) {
                    wrapperConf.spaBundle = overrides.spaBundle ? overrides.spaBundle : wrapperConf.spaBundle;
                    wrapperConf.cssBundle = overrides.cssBundle ? overrides.cssBundle : wrapperConf.cssBundle;
                } else {
                    appConf.spaBundle = overrides.spaBundle ? overrides.spaBundle : appConf.spaBundle;
                    appConf.cssBundle = overrides.cssBundle ? overrides.cssBundle : appConf.cssBundle;
                }

                const waitTill = [System.import(appConf.spaBundle)];
                if (wrapperConf !== null) {
                    waitTill.push(System.import(wrapperConf.spaBundle));
                }

                if (appConf.cssBundle !== undefined) {
                    waitTill.push(importCssBundle(appConf.cssBundle));
                }
                if (wrapperConf !== null && wrapperConf.cssBundle !== undefined) {
                    waitTill.push(importCssBundle(wrapperConf.cssBundle));
                }

                return Promise.all(waitTill).then(([spaBundle, wrapperBundle]) => {
                    let spaCallbacks = getAppSpaCallbacks(spaBundle, appConf.props);
                    if (wrapperConf !== null) {
                        const wrapperSpaCallbacks = getAppSpaCallbacks(wrapperBundle, wrapperConf.props);

                        const wrapper = new WrapApp(wrapperConf, overrides.wrapperPropsOverride);

                        spaCallbacks = wrapper.wrapWith(spaCallbacks, wrapperSpaCallbacks);
                    }

                    return prependSpaCallback(spaCallbacks, 'unmount', onUnmount);
                });
            },
            isActiveFactory(router, appName, slotName),
            {
                domElementGetter: () => getSlotElement(slotName),
                getCurrentPathProps: () => router.getCurrentRouteProps(appName, slotName),
                getCurrentBasePath: () => router.getCurrentRoute().basePath,
                appId, // Unique application ID, if same app will be rendered twice on a page - it will get different IDs
                errorHandler: appErrorHandlerFactory(appName, slotName),
                appSdk,
            }
        );
    });
}

function importCssBundle(url) {
    return System.import(url).catch(err => { //TODO: inserted <link> tags should have "data-fragment-id" attr. Same as Tailor now does
        //TODO: error handling should be improved, need to submit PR with typed errors
        if (typeof err.message !== 'string' || err.message.indexOf('has already been loaded using another way') === -1) {
            throw err;
        }
    });
}
