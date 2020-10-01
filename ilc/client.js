import './client/navigationEvents';
import * as singleSpa from 'single-spa';

import Router from './client/ClientRouter';
import setupErrorHandlers from './client/errorHandler/setupErrorHandlers';
import {fragmentErrorHandlerFactory, crashIlc} from './client/errorHandler/fragmentErrorHandlerFactory';
import isActiveFactory from './client/isActiveFactory';
import initIlcConfig from './client/initIlcConfig';
import initIlcState from './client/initIlcState';
import setupPerformanceMonitoring from './client/performance';
import selectSlotsToRegister from './client/selectSlotsToRegister';
import {getSlotElement} from './client/utils';
import AsyncBootUp from './client/AsyncBootUp';
import IlcAppSdk from 'ilc-server-sdk/dist/client';

const System = window.System;
if (System === undefined) {
    crashIlc();
    throw new Error('ILC: can\'t find SystemJS on a page, crashing everything');
}

const intlAdapterSystem = {
    get: () => ({locale: document.documentElement.lang, currency: 'USD'}),
    getDefault: () => ({locale: 'en-US', currency: 'USD'}),
    getSupported: () => ({locale: ['en-US', 'fr-FR', 'en-GB', 'fr-CA'], currency: ['USD', 'EUR', 'GBP']}),
};

const systemSdk = new IlcAppSdk({appId: 'ILC:System', intl: intlAdapterSystem});

const patchedLocation = new Proxy(window.location, {
    get(target, name) {
        if (['assign', 'reload', 'replace', 'toString'].indexOf(name) !== -1) {
            return target[name];
        }

        return systemSdk.intl.parseUrl(target).cleanUrl[name];
    },
});
const patchedWindow = new Proxy(window, {
    get(target, name) {
        return name === 'location' ? patchedLocation : target[name];
    },
});

window.ILC.window = patchedWindow;

const registryConf = initIlcConfig();
const state = initIlcState();
const router = new Router(registryConf, state, singleSpa, window.ILC.window.location);
const asyncBootUp = new AsyncBootUp();

// Here we expose window.ILC.define also as window.define to ensure that regular AMD/UMD bundles work correctly by default
// See docs/umd_bundles_compatibility.md
if (!registryConf.settings.amdDefineCompatibilityMode) {
    window.define = window.ILC.define;
}

let startedLangChangeFor = null;

const intlAdapter = Object.assign({
    async set(conf) {
        if (!conf.locale) {
            return;
        }

        if (!this.getSupported().locale.includes(conf.locale)) {
            throw new Error('Invalid locale passed');
        }
        document.documentElement.lang = conf.locale;
        const newLocaleUrl = systemSdk.intl.localizeUrl(window.location, conf.locale).toString();
        startedLangChangeFor = newLocaleUrl;
        singleSpa.navigateToUrl(newLocaleUrl);
    }
}, intlAdapterSystem);

window.addEventListener('single-spa:before-mount-routing-event', e => {
    if (startedLangChangeFor !== null && startedLangChangeFor !== window.location.href) {
        console.warn('ILC: looks like we have unfinished language chage process... Canceling it.');
        startedLangChangeFor = null;
    } else if (startedLangChangeFor === null) {
        return;
    }
    startedLangChangeFor = null;

    let loader = null;
    const promises = [];

    const onAllResourcesReady = () => iterablePromise(promises).then(() => {
        if (loader) {
            loader.close();
            window.document.body.removeChild(loader);
            loader = null;
        }
    });
    const detail = Object.assign(systemSdk.intl.get(), {
        addPendingResources: (promise) => {
            if (!loader) {
                loader = document.createElement('dialog');
                loader.innerHTML = 'loading....';
                window.document.body.append(loader);
                loader.showModal();
            }
            promises.push(promise);
        },
        onAllResourcesReady: onAllResourcesReady,
    });

    window.dispatchEvent(new CustomEvent('ilc:intl-update', {detail}));
    return onAllResourcesReady();
});

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
                errorHandler: fragmentErrorHandlerFactory(registryConf, router.getCurrentRoute, appName, slotName),
                clientSdk: new IlcAppSdk({appId: fragmentName, intl: intlAdapter}),
            }
        );
    });
});

window.zzz = new IlcAppSdk({appId: 'tst', intl: intlAdapter});

setupErrorHandlers(registryConf, router.getCurrentRoute);
setupPerformanceMonitoring(router.getCurrentRoute);

singleSpa.setBootstrapMaxTime(5000, false);
singleSpa.setMountMaxTime(5000, false);
singleSpa.setUnmountMaxTime(3000, false);
singleSpa.setUnloadMaxTime(3000, false);

singleSpa.start({urlRerouteOnly: true});

function iterablePromise(iterable) {
    return Promise.all(iterable).then((resolvedIterable) => {
        if (iterable.length !== resolvedIterable.length) {
            // The list of promises or values changed. Return a new Promise.
            // The original promise won't resolve until the new one does.
            return iterablePromise(iterable);
        }
        // The list of promises or values stayed the same.
        // Return results immediately.
        return resolvedIterable;
    });
}
