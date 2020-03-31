import * as singleSpa from 'single-spa';

import Router from './common/router/ClientRouter';
import setupErrorHandlers from './client/errorHandler/setupErrorHandlers';
import {fragmentErrorHandlerFactory, crashIlc} from './client/errorHandler/fragmentErrorHandlerFactory';
import { renderFakeSlot, addContentListener } from './client/pageTransitions';
import initSpaConfig from './client/initSpaConfig';
import setupPerformanceMonitoring from './client/performance';
import selectSlotsToRegister from './client/selectSlotsToRegister';
import { getSlotElement } from './client/utils';
import * as asyncBootup from './client/asyncBootup';

const System = window.System;
if (System === undefined) {
    crashIlc();
    throw new Error('ILC: can\'t find SystemJS on a page, crashing everything');
}

const registryConf = initSpaConfig();
const router = new Router(registryConf);

asyncBootup.init();

selectSlotsToRegister([...registryConf.routes, registryConf.specialRoutes['404']]).forEach((slots) => {
    Object.keys(slots).forEach((slotName) => {
        const appName = slots[slotName].appName;

        const fragmentName = `${appName.replace('@portal/', '')}__at__${slotName}`;

        singleSpa.registerApplication(
            fragmentName,
            async () => {
                const appConf = registryConf.apps[appName];

                const overrides = await asyncBootup.waitForSlot(slotName);
                const spaBundle = overrides.spaBundle ? overrides.spaBundle : appConf.spaBundle;
                const cssBundle = overrides.cssBundle ? overrides.cssBundle : appConf.cssBundle;

                const waitTill = [System.import(spaBundle)];

                if (cssBundle !== undefined) {
                    waitTill.push(System.import(cssBundle).catch(err => { //TODO: inserted <link> tags should have "data-fragment-id" attr. Same as Tailor now does
                        //TODO: error handling should be improved, need to submit PR with typed errors
                        if (err.message.indexOf('has already been loaded using another way') === -1) {
                            throw err;
                        }
                    }));
                }

                return Promise.all(waitTill)
                    .then(v => v[0].mainSpa !== undefined ? v[0].mainSpa(appConf.initProps || {}) : v[0]);
            },
            isActiveFactory(appName, slotName),
            {
                domElementGetter: () => getSlotElement(slotName),
                getCurrentPathProps: () => router.getCurrentRouteProps(appName, slotName),
                getCurrentBasePath: () => router.getCurrentRoute().basePath,
                errorHandler: fragmentErrorHandlerFactory(registryConf, router.getCurrentRoute, appName, slotName)
            }
        );
    });
});

function isActiveFactory(appName, slotName) {
    let reload = false;

    return () => {
        const checkActivity = (route) => Object.entries(route.slots).some(([
            currentSlotName,
            slot
        ]) => slot.appName === appName && currentSlotName === slotName);

        let isActive = checkActivity(router.getCurrentRoute());
        const wasActive = checkActivity(router.getPrevRoute());

        const willBeRendered = !wasActive && isActive;
        const willBeRemoved = wasActive && !isActive;
        let willBeRerendered = false;

        if (isActive && wasActive && reload === false) {
            const oldProps = router.getPrevRouteProps(appName, slotName);
            const currProps = router.getCurrentRouteProps(appName, slotName);

            if (JSON.stringify(oldProps) !== JSON.stringify(currProps)) {
                window.addEventListener('single-spa:app-change', function singleSpaAppChange() {
                    window.removeEventListener('single-spa:app-change', singleSpaAppChange);
                    //TODO: need to consider addition of the new update() hook to the adapter. So it will be called instead of re-mount, if available.
                    console.log(`ILC: Triggering app re-mount for ${appName} due to changed props.`);

                    reload = true;

                    singleSpa.triggerAppChange();
                });

                isActive = false;
                willBeRerendered = true;
            }
        }

        if (willBeRendered) {
            addContentListener(slotName);
        } else if (willBeRemoved) {
            renderFakeSlot(slotName);
        } else if (willBeRerendered) {
            renderFakeSlot(slotName);
            addContentListener(slotName);
        }

        reload = false;

        return isActive;
    }
}

setupErrorHandlers(registryConf, router.getCurrentRoute);
setupPerformanceMonitoring(router.getCurrentRoute);

singleSpa.setBootstrapMaxTime(5000, false);
singleSpa.setMountMaxTime(5000, false);
singleSpa.setUnmountMaxTime(3000, false);
singleSpa.setUnloadMaxTime(3000, false);

singleSpa.start({ urlRerouteOnly: true });
