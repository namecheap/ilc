import * as singleSpa from 'single-spa';

import Router from './client/ClientRouter';
import setupErrorHandlers from './client/errorHandler/setupErrorHandlers';
import {fragmentErrorHandlerFactory, crashIlc} from './client/errorHandler/fragmentErrorHandlerFactory';
import isActiveFactory from './client/isActiveFactory';
import initSpaConfig from './client/initSpaConfig';
import setupPerformanceMonitoring from './client/performance';
import selectSlotsToRegister from './client/selectSlotsToRegister';
import {getSlotElement} from './client/utils';
import AsyncBootUp from './client/AsyncBootUp';

const System = window.System;
if (System === undefined) {
    crashIlc();
    throw new Error('ILC: can\'t find SystemJS on a page, crashing everything');
}

const registryConf = initSpaConfig();
const router = new Router(registryConf, singleSpa.navigateToUrl);
const asyncBootUp = new AsyncBootUp();

selectSlotsToRegister([...registryConf.routes, registryConf.specialRoutes['404']]).forEach((slots) => {
    Object.keys(slots).forEach((slotName) => {
        const appName = slots[slotName].appName;

        const fragmentName = `${appName.replace('@portal/', '')}__at__${slotName}`;

        singleSpa.registerApplication(
            fragmentName,
            async () => {
                const appConf = registryConf.apps[appName];

                System.import(appConf.spaBundle); // Speculative preload of the JS bundle

                const overrides = await asyncBootUp.waitForSlot(slotName);
                const spaBundle = overrides.spaBundle ? overrides.spaBundle : appConf.spaBundle;
                const cssBundle = overrides.cssBundle ? overrides.cssBundle : appConf.cssBundle;

                const waitTill = [System.import(spaBundle)];

                if (cssBundle !== undefined) {
                    waitTill.push(System.import(cssBundle).catch(err => { //TODO: inserted <link> tags should have "data-fragment-id" attr. Same as Tailor now does
                        //TODO: error handling should be improved, need to submit PR with typed errors
                        if (typeof err.message !== 'string' || err.message.indexOf('has already been loaded using another way') === -1) {
                            throw err;
                        }
                    }));
                }

                return Promise.all(waitTill)
                    .then(v => v[0].mainSpa !== undefined ? v[0].mainSpa(appConf.props || {}) : v[0]);
            },
            isActiveFactory(router, appName, slotName),
            {
                domElementGetter: () => getSlotElement(slotName),
                getCurrentPathProps: () => router.getCurrentRouteProps(appName, slotName),
                getCurrentBasePath: () => router.getCurrentRoute().basePath,
                appId: fragmentName, // Unique application ID, if same app will be rendered twice on a page - it will get different IDs
                errorHandler: fragmentErrorHandlerFactory(registryConf, router.getCurrentRoute, appName, slotName)
            }
        );
    });
});

setupErrorHandlers(registryConf, router.getCurrentRoute);
setupPerformanceMonitoring(router.getCurrentRoute);

singleSpa.setBootstrapMaxTime(5000, false);
singleSpa.setMountMaxTime(5000, false);
singleSpa.setUnmountMaxTime(3000, false);
singleSpa.setUnloadMaxTime(3000, false);

singleSpa.start({urlRerouteOnly: true});
