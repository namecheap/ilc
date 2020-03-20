import * as singleSpa from 'single-spa';
import deepmerge from 'deepmerge';

import * as Router from './common/router/Router';
import selectSlotsToRegister from './client/selectSlotsToRegister';
import setupErrorHandlers from './client/errorHandler/setupErrorHandlers';
import {fragmentErrorHandlerFactory, crashIlc} from './client/errorHandler/fragmentErrorHandlerFactory';
import { renderFakeSlot, addContentListener } from './client/pageTransitions';
import initSpaConfig from './client/initSpaConfig';
import setupPerformanceMonitoring from './client/performance';

const System = window.System;
if (System === undefined) {
    crashIlc();
    throw new Error('ILC: can\'t find SystemJS on a page, crashing everything');
}

// Tailor injects <link> tags near SSRed body of the app inside "slot" tag
// this causes removal of the loaded CSS from the DOM after app unmount.
// So we're "saving" such elements by moving them to the <head>
Array.prototype.slice.call(document.body.querySelectorAll('link[data-fragment-id]')).reduce((hrefs, link) => {
    if (hrefs.has(link.href)) {
        link.parentNode.removeChild(link)
    } else {
        hrefs.add(link.href);
        document.head.append(link);
    }

    return hrefs;
}, new Set());

const registryConf = initSpaConfig();

const router = new Router(registryConf);

let currentPath = (function() {
    // we should respect base tag for cached pages
    const base = document.querySelector('base');
    let path;
    if (base) {
        const a = document.createElement('a');
        a.href = base.getAttribute('href');
        path = a.pathname + a.search;
        base.remove();
        console.warn('ILC: <base> tag was used only for initial rendering & removed afterwards. Currently we\'re not respecting it fully. Pls open an issue if you need this functionality.');
    } else {
        path = window.location.pathname + window.location.search;
    }
    return router.match(path);
})();
let prevPath = currentPath;


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

                return Promise.all(waitTill).then(v => v[0].mainSpa !== undefined ? v[0].mainSpa(appConf.initProps || {}) : v[0]);
            },
            isActiveFactory(appName, slotName),
            {
                domElementGetter: getMountPointFactory(slotName),
                getCurrentPathProps: getCurrentPathPropsFactory(appName, slotName),
                getCurrentBasePath,
                errorHandler: fragmentErrorHandlerFactory(registryConf, getCurrentPath, appName, slotName)
            }
        );
    });
});

function getMountPointFactory(slotName) {
    return () => {
        return document.getElementById(slotName)
    };
}

function isActiveFactory(appName, slotName) {
    let reload = false;

    return () => {
        const checkActivity = (path) => Object.entries(path.slots).some(([
            currentSlotName,
            slot
        ]) => slot.appName === appName && currentSlotName === slotName);

        let isActive = checkActivity(currentPath);
        const wasActive = checkActivity(prevPath);

        const willBeRendered = !wasActive && isActive;
        const willBeRemoved = wasActive && !isActive;
        let willBeRerendered = false;

        if (isActive && wasActive && reload === false) {
            const oldProps = getPathProps(appName, slotName, prevPath);
            const currProps = getPathProps(appName, slotName, currentPath);

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

function getCurrentPathPropsFactory(appName, slotName) {
    return () => getPathProps(appName, slotName, currentPath);
}

function getPathProps(appName, slotName, path) {
    const appProps = registryConf.apps[appName].props || {};
    const routeProps = path.slots[slotName] && path.slots[slotName].props || {};
    return deepmerge(appProps, routeProps);
}

function getCurrentPath() {
    return currentPath;
}

function getCurrentBasePath() {
    return currentPath.basePath;
}

let currentUrl = window.location.pathname + window.location.search;
window.addEventListener('single-spa:before-routing-event', () => {
    prevPath = currentPath;

    // fix for google cached pages.
    // if open any cached page and scroll to "#features"
    // url changed and <base> tag has already removed and router.match will return error
    // so in this case we shouldn't regenerate currentPath
    const newUrl = window.location.pathname + window.location.search
    if (currentUrl !== newUrl) {
        currentPath = router.match(window.location.pathname + window.location.search);
        currentUrl = newUrl;
    }

    if (currentPath && prevPath.template !== currentPath.template) {
        throw new Error('Base template was changed and I still don\'t know how to handle it :(');
    }
});

document.addEventListener('click', function (e) {
    const anchor = e.target.tagName === 'A'
        ? e.target
        : e.target.closest('a');
    const href = anchor && anchor.getAttribute('href');

    if (e.defaultPrevented === true || !href) {
        return;
    }

    const pathname = href.replace(window.location.origin, '');

    const { specialRole } = router.match(pathname);

    if (specialRole === null) {
        singleSpa.navigateToUrl(pathname);
        e.preventDefault();
    }
});

setupErrorHandlers(registryConf, getCurrentPath);
setupPerformanceMonitoring(getCurrentPath);

singleSpa.setBootstrapMaxTime(5000, false);
singleSpa.setMountMaxTime(5000, false);
singleSpa.setUnmountMaxTime(3000, false);
singleSpa.setUnloadMaxTime(3000, false);

singleSpa.start({
    urlRerouteOnly: true,
});
