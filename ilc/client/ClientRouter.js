import deepmerge from 'deepmerge';
import debug from 'debug';
import EventEmitter from 'eventemitter3';

import Router from '../common/router/Router';
import * as errors from '../common/router/errors';
import { isSpecialUrl } from 'ilc-sdk/app';
import { triggerAppChange } from './navigationEvents';
import { appIdToNameAndSlot } from '../common/utils';
import { FRAGMENT_KIND } from '../common/constants';
import { slotWillBe } from './TransactionManager/TransactionManager';

export default class ClientRouter extends EventEmitter {
    errors = errors;

    #currentUrl;
    #singleSpa;
    #location;
    #logger;
    #registryConf;
    /** @type Object<Router> */
    #router;
    #prevRoute;
    #currentRoute;
    #windowEventHandlers = {};
    #forceSpecialRoute = null;
    #i18n;
    #debug;
    render404;
    #handlePageTransaction;
    #activeApps = {
        prev: {},
        current: {},
    };

    constructor(
        registryConf,
        state,
        i18n = {
            unlocalizeUrl: (url) => url,
            localizeUrl: (url) => url,
        },
        singleSpa,
        handlePageTransaction,
        location = window.location,
        logger = window.console
    ) {
        super();

        this.#handlePageTransaction = handlePageTransaction;
        this.#singleSpa = singleSpa;
        this.#location = location;
        this.#logger = logger;
        this.#i18n = i18n;
        this.#registryConf = registryConf;
        this.#router = new Router(registryConf);
        this.#currentUrl = this.#getCurrUrl();
        this.#debug = debug('ILC:ClientRouter');

        this.render404 = this.#createSpecialRouteHandler(404);

        this.#setInitialRoutes(state);
        this.#addEventListeners();
    }

    getPrevRoute = () => this.#prevRoute;
    getCurrentRoute = () => this.#currentRoute;

    getPrevRouteProps = (appName, slotName) => this.#getRouteProps(appName, slotName, this.#prevRoute);
    getCurrentRouteProps = (appName, slotName) => this.#getRouteProps(appName, slotName, this.#currentRoute);

    match = (url) => this.#router.match(this.#i18n.unlocalizeUrl(url.replace(this.#location.origin, '') || '/'));
    navigateToUrl = (url) => this.#singleSpa.navigateToUrl(this.#i18n.localizeUrl(url));

    getRelevantAppKind(appName, slotName) {
        const appKind = this.#registryConf.apps[appName].kind;

        const currentRoute = this.getCurrentRoute();
        const slotKindCurr = currentRoute.slots[slotName] && currentRoute.slots[slotName].kind;
        // Here we're also checking previous route as app may throw an error right after URL change.
        // During unmounting for example.
        const previousRoute = this.getPrevRoute();
        const slotKindPrev = previousRoute.slots[slotName] && previousRoute.slots[slotName].kind;

        return slotKindCurr || slotKindPrev || appKind;
    }

    isAppWithinSlotActive(appName, slotName) {
        let isActive = this.#activeApps.current[slotName] === appName;
        const wasActive = this.#activeApps.prev[slotName] === appName;

        let willBe = slotWillBe.default;
        !wasActive && isActive && (willBe = slotWillBe.rendered);
        wasActive && !isActive && (willBe = slotWillBe.removed);

        this.#handlePageTransaction(slotName, willBe);

        return isActive;
    }

    #getRouteProps(appName, slotName, route) {
        if (this.#registryConf.apps[appName] === undefined) {
            throw new this.errors.RouterError({message: 'Can not find info about the app.', data: {appName}});
        }

        if (route.slots[slotName] === undefined) {
            throw new this.errors.RouterError({message: 'Can not find info about the slot.', data: {slotName}});
        }

        const appProps = this.#registryConf.apps[appName].props || {};
        const routeProps = route.slots[slotName].props || {};

        return deepmerge(appProps, routeProps);
    }

    #setInitialRoutes = (state) => {
        // we should respect base tag for cached pages
        const base = document.querySelector('base');

        if (base) {
            const a = document.createElement('a');
            a.href = base.getAttribute('href');
            this.#currentRoute = this.#router.match(a.pathname + a.search);

            base.remove();
            this.#logger.warn(
                'ILC: <base> tag was used only for initial rendering and removed afterwards.\n' +
                'Currently, ILC does not support it fully.\n' +
                'Please open an issue if you need this functionality.'
            );
        } else if (state.forceSpecialRoute === '404') {
            this.#currentRoute = this.#router.matchSpecial(this.#getCurrUrl(), state.forceSpecialRoute);
        } else {
            this.#currentRoute = this.#router.match(this.#getCurrUrl());
        }

        this.#prevRoute = this.#currentRoute;

        this.#activeApps.prev = this.#createActiveAppsObject(this.#prevRoute.slots);
        this.#activeApps.current = this.#createActiveAppsObject(this.#currentRoute.slots);
    };

    #addEventListeners = () => {
        this.#windowEventHandlers['ilc:before-routing'] = this.#onSingleSpaRoutingEvents;
        this.#windowEventHandlers['ilc:404'] = this.render404;

        for (let key in this.#windowEventHandlers) {
            if (!this.#windowEventHandlers.hasOwnProperty(key)) {
                continue;
            }

            window.addEventListener(key, this.#windowEventHandlers[key]);
        }

        // It's important to attach "click" listener to window as React apps attach their own to "document"
        // So if ours is also at the document - it will be likely executed first. Which breaks "defaultPrevented" detection
        // From React doc:
        //    React doesn’t actually attach event handlers to the nodes themselves.
        //    When React starts up, it starts listening for all events at the top level using a single event listener.
        window.addEventListener('click', this.#onClickLink);
    };

    removeEventListeners() {
        for (let key in this.#windowEventHandlers) {
            if (!this.#windowEventHandlers.hasOwnProperty(key)) {
                continue;
            }

            window.removeEventListener(key, this.#windowEventHandlers[key]);
        }
        this.#windowEventHandlers = {};

        window.removeEventListener('click', this.#onClickLink);
    }

    #onSingleSpaRoutingEvents = () => {
        this.#prevRoute = this.#currentRoute;

        const newUrl = this.#getCurrUrl();
        if (this.#forceSpecialRoute !== null && this.#forceSpecialRoute.url === this.#getCurrUrl(true)) {
            this.#currentRoute = this.#router.matchSpecial(newUrl, this.#forceSpecialRoute.id);
        } else if (this.#forceSpecialRoute !== null) {
            // Reset variable if it was set & now we go to different route
            this.#forceSpecialRoute = null;
        }

        // fix for google cached pages.
        // if open any cached page and scroll to "#features" section:
        // only hash will be changed so router.match will return error, since <base> tag has already been removed.
        // so in this cases we shouldn't regenerate currentRoute
        if (this.#currentUrl !== newUrl) {
            this.#currentRoute = this.#router.match(this.#getCurrUrl());
            this.#currentUrl = newUrl;
        }

        if (this.#currentRoute && this.#prevRoute.template !== this.#currentRoute.template) {
            throw new this.errors.RouterError({
                message:
                    'Base template was changed.\n' +
                    'Currently, ILC does not handle it.\n' +
                    'Please open an issue if you need this functionality.',
                data: {
                    prevTemplate: this.#prevRoute.template,
                    currentTemplate: this.#currentRoute.template
                },
            });
        }

        this.#activeApps.prev = this.#createActiveAppsObject(this.#prevRoute.slots);
        this.#activeApps.current = this.#createActiveAppsObject(this.#currentRoute.slots);

        const appsWithDifferentProps = this.#getAppsWithDifferentProps(this.#prevRoute.slots, this.#currentRoute.slots);
        if (appsWithDifferentProps.length) {
            const appsToForceRerender = [];
            const updateEventsToTrigger = [];

            appsWithDifferentProps.forEach(({ slotName, appName }) => {
                const eventUpdateFragment = `ilc:update:${slotName}_${appName}`;

                // if fragment provided "update" lifecycle method then it will be updated immediately w/o remounting app
                // otherwise the fragment will be unmounted and mounted with new props
                if (this.listenerCount(eventUpdateFragment)) {
                    updateEventsToTrigger.push(eventUpdateFragment);
                } else {
                    // temporary remove slot with old props, to remove it from DOM
                    // it will be rendered with new props with the help of "triggerAppChange"
                    appsToForceRerender.push(appName)
                    delete this.#activeApps.current[slotName];
                }
            });

            window.addEventListener('single-spa:app-change', () => {
                if (updateEventsToTrigger.length) {
                    updateEventsToTrigger.forEach(this.emit.bind(this));
                }

                if (appsToForceRerender.length) {
                    this.#logger.log(`ILC: Triggering app re-mount for [${appsToForceRerender}] due to changed props.`);

                    triggerAppChange();
                }
            }, { once: true });
        }
    };

    #createActiveAppsObject(slots) {
        return Object.entries(slots).reduce((acc, [slotName, slotApp]) => {
            acc[slotName] = slotApp.appName;
            return acc;
        }, {});
    }

    #getAppsWithDifferentProps(prevSlots, currentSlots) {
        return Object.entries(prevSlots).reduce((acc, [slotName, prevSlotApp]) => {
            const currentSlotApp = currentSlots[slotName];
            
            if (!currentSlotApp) {
                return acc;
            }

            const isTheSameSlotApp = currentSlotApp.appName === prevSlotApp.appName;
            if (!isTheSameSlotApp) {
                return acc;
            }

            if (JSON.stringify(prevSlotApp.props) === JSON.stringify(currentSlotApp.props)) {
                return acc;
            }

            return [...acc, {
                appName: currentSlotApp.appName,
                slotName,
            }];
        }, []);
    }

    #onClickLink = (event) => {
        const {
            metaKey, // command / windows meta key - opens new tab (Chrome@87 / Safari@14 / Firefox@83)
            altKey, // option / alt - downloads page(Chrome@87 / Safari@14), do nothing (Firefox@83)
            ctrlKey, // control / ctrl - opens context menu. it works in spite of preventing default behaviour (Chrome@87 / Safari@14 / Firefox@83), but it's good to ignore ILC handling in this case too
            shiftKey, // shift - opens new window (Chrome@87 / Firefox@83), add to "read latter"(Safari@14)
        } = event;

        if (metaKey || altKey || ctrlKey || shiftKey) {
            return;
        }

        const anchor = event.target.tagName === 'A'
            ? event.target
            : event.target.closest('a');
        const href = anchor && anchor.getAttribute('href');

        if (event.defaultPrevented || href === null || !['', '_self'].includes(anchor.target) || isSpecialUrl(href)) {
            return;
        }

        const {specialRole} = this.match(href);
        if (specialRole === null) {
            this.#debug(`Calling singleSpa.navigateToUrl("${href}")`);
            this.#singleSpa.navigateToUrl(href);
            event.preventDefault();
        }
    };

    #createSpecialRouteHandler = (specialRouteId) => (e) => {
        const appId = e.detail && e.detail.appId;

        const mountedApps = this.#singleSpa.getMountedApps();
        if (!mountedApps.includes(appId)) {
            return this.#logger.warn(
                `ILC: Ignoring special route "${specialRouteId}" trigger which came from not mounted app "${appId}". ` +
                `Currently mounted apps: ${mountedApps.join(', ')}.`
            );
        }

        const { appName, slotName } = appIdToNameAndSlot(appId);
        const fragmentKind = this.getRelevantAppKind(appName, slotName);
        const isPrimary = fragmentKind === FRAGMENT_KIND.primary;

        if (specialRouteId === 404 && !isPrimary) {
            return this.#logger.warn(
                `ILC: Ignoring special route "${specialRouteId}" trigger which came from non-primary app "${appId}". ` +
                `"${appId}" is "${fragmentKind}"`
            );
        }

        this.#logger.log(`ILC: Special route "${specialRouteId}" was triggered by "${appId}" app. Performing rerouting...`);

        this.#forceSpecialRoute = {id: specialRouteId, url: this.#getCurrUrl(true)};

        triggerAppChange(); //This call would immediately invoke "ilc:before-routing" and start apps mount/unmount process
    };

    #getCurrUrl = (withLocale = false) => {
        const url = this.#location.pathname + this.#location.search;

        if (withLocale) {
            return url;
        }

        return this.#i18n.unlocalizeUrl(url);
    }
}
