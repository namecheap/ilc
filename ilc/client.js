import * as singleSpa from 'single-spa';

import Router from './common/router/ClientRouter';
import setupErrorHandlers from './client/errorHandler/setupErrorHandlers';
import {fragmentErrorHandlerFactory, crashIlc} from './client/errorHandler/fragmentErrorHandlerFactory';
import { renderFakeSlot, addContentListener } from './client/pageTransitions';
import initSpaConfig from './client/initSpaConfig';
import setupPerformanceMonitoring from './client/performance';
import selectSlotsToRegister from './client/selectSlotsToRegister';
import { getSlotElement } from './client/utils';

const System = window.System;
if (System === undefined) {
    crashIlc();
    throw new Error('ILC: can\'t find SystemJS on a page, crashing everything');
}

const registryConf = initSpaConfig();
const router = new Router(registryConf);

const perfStart = performance.now();
let afterRoutingEvent = false;
const appsWaitingForSlot = {};
for (let id of window.ilcApps) {
    appsWaitingForSlot[id] && appsWaitingForSlot[id]();
}
window.ilcApps = {push: (id) => (appsWaitingForSlot[id] && appsWaitingForSlot[id]())};

selectSlotsToRegister([...registryConf.routes, registryConf.specialRoutes['404']]).forEach((slots) => {
    Object.keys(slots).forEach((slotName) => {
        const appName = slots[slotName].appName;

        const fragmentName = `${appName.replace('@portal/', '')}__at__${slotName}`;

        singleSpa.registerApplication(
            fragmentName,
            () => {
                const waitTill = [System.import(appName)];
                const appConf = registryConf.apps[appName];

                if (appConf.cssBundle !== undefined) {
                    waitTill.push(System.import(appConf.cssBundle).catch(err => { //TODO: inserted <link> tags should have "data-fragment-id" attr. Same as Tailor now does
                        //TODO: error handling should be improved, need to submit PR with typed errors
                        if (err.message.indexOf('has already been loaded using another way') === -1) {
                            throw err;
                        }
                    }));
                }

                const waitForSlot = new Promise(resolve => {
                    const id = `${appName}:::${slotName}`;
                    try {
                        getSlotElement(slotName);
                        return resolve();
                    } catch (e) {}

                    appsWaitingForSlot[id] = resolve;
                }).then(() => {
                    !afterRoutingEvent && console.info(`ILC: Registering ${fragmentName} after ` + (performance.now() - perfStart) + ` milliseconds.`);
                });
                waitTill.push(waitForSlot);

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
window.addEventListener('single-spa:routing-event', () => (afterRoutingEvent = true));

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
