import deepmerge from 'deepmerge';
import debug from 'debug';
import EventEmitter from 'eventemitter3';

import { Router } from '../common/router/Router';
import * as errors from '../common/router/errors';
import { isSpecialUrl } from 'ilc-sdk/app';
import { triggerAppChange } from './navigationEvents';
import { appIdToNameAndSlot, getSlotEntries, makeAppId } from '../common/utils';
import { placeAppContainer } from './utils';
import { FRAGMENT_KIND } from '../common/constants';
import { slotWillBe } from './TransitionManager/TransitionManager';
import ilcEvents from './constants/ilcEvents';

export default class ClientRouter extends EventEmitter {
    errors = errors;

    #currentUrl;
    #singleSpa;
    #location;
    #logger;
    #registryConf;
    #ilcConfigRoot;
    #ilcState;
    /** @type Object<Router> */
    #router;
    #prevRoute;
    #currentRoute;
    #windowEventHandlers = {};
    #forceSpecialRoute = null;
    #i18n;
    #debug;
    render404;
    #handlePageTransition;
    #activeApps = {
        prev: {},
        current: {},
    };
    /**
     * Kept-alive apps: appId -> { routeProps, mergedProps }. An app lands here when it leaves a slot
     * whose route entry marked it `keepAlive`; it stays mounted (hidden) until a route lists it again.
     */
    #keptAlive = new Map();

    constructor(
        ilcConfigRoot,
        state,
        i18n = {
            unlocalizeUrl: (url) => url,
            localizeUrl: (url) => url,
        },
        singleSpa,
        handlePageTransition,
        location = window.location,
        logger = window.console,
    ) {
        super();

        this.#handlePageTransition = handlePageTransition;
        this.#singleSpa = singleSpa;
        this.#location = location;
        this.#logger = logger;
        this.#i18n = i18n;
        this.#ilcState = state ?? {};
        this.#ilcConfigRoot = ilcConfigRoot;
        this.#registryConf = this.#ilcConfigRoot.getConfig();
        this.#router = new Router(this.#registryConf);
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

    /**
     * Base path of the route the app is shown on. A hidden kept-alive app keeps the base path of the route it was
     * last shown on, as it keeps its route props: the current URL belongs to the visible app.
     */
    getCurrentBasePath(appName, slotName) {
        const kept = this.#keptAlive.get(makeAppId(appName, slotName));

        if (kept && !this.#findSlotEntry(this.#currentRoute, slotName, appName)) {
            return kept.basePath;
        }

        return this.#currentRoute.basePath;
    }

    match = (url) => this.#router.match(this.#i18n.unlocalizeUrl(url.replace(this.#location.origin, '') || '/'));
    navigateToUrl = (url) => this.#singleSpa.navigateToUrl(this.#i18n.localizeUrl(url));

    /**
     * Get the relevant application kind for a given app name and slot name.
     *
     * @param {string} appName - The name of the application.
     * @param {string} slotName - The name of the slot.
     *
     * @returns {string} 'regular' | 'primary' | 'essential'
     *
     * @throws {RouterError} Throws a RouterError if information about the app cannot be found in the registry.
     *
     * @method
     */
    getRelevantAppKind(appName, slotName) {
        const app = this.#registryConf.apps[appName];

        if (!app) {
            throw new this.errors.RouterError({ message: 'Can not find info about the app.', data: { appName } });
        }

        const appKind = app.kind;

        const slotKindCurr = this.#findSlotEntry(this.getCurrentRoute(), slotName, appName)?.kind;
        // Here we're also checking previous route as app may throw an error right after URL change.
        // During unmounting for example.
        const slotKindPrev = this.#findSlotEntry(this.getPrevRoute(), slotName, appName)?.kind;

        return slotKindCurr || slotKindPrev || appKind;
    }

    isAppWithinSlotActive(appName, slotName) {
        const isActive = (this.#activeApps.current[slotName] || []).includes(appName);
        const wasActive = (this.#activeApps.prev[slotName] || []).includes(appName);
        const isClientless = this.#ilcConfigRoot.isApplicationClientlessByAppName(appName);
        const appId = makeAppId(appName, slotName);

        if (wasActive && !isActive && !isClientless && this.#isKeepAliveEntry(this.#prevRoute, slotName, appName)) {
            // Keep-alive: the app leaves the route but stays mounted, hidden.
            this.#keptAlive.set(appId, {
                routeProps: JSON.stringify(this.#findSlotEntry(this.#prevRoute, slotName, appName).props || {}),
                mergedProps: this.#getRouteProps(appName, slotName, this.#prevRoute),
                basePath: this.#prevRoute.basePath,
            });
            this.#setAppVisibility(appId, appName, slotName, false);
            this.#handlePageTransition(slotName, slotWillBe.default, this.getRelevantAppKind(appName, slotName));

            return true;
        }

        if (this.#keptAlive.has(appId)) {
            if (isActive && !wasActive) {
                // Keep-alive: a route lists the app again; show it, no remount.
                this.#setAppVisibility(appId, appName, slotName, true);
                this.#handlePageTransition(slotName, slotWillBe.default, this.getRelevantAppKind(appName, slotName));
            }

            return true;
        }

        //Todo: side effect have to be removed from getter
        let willBe = slotWillBe.default;

        if (!wasActive && isActive) {
            willBe = slotWillBe.rendered;
        }

        if (wasActive && !isActive) {
            willBe = slotWillBe.removed;
        }

        if (isClientless) {
            willBe = slotWillBe.default;
        }

        this.#handlePageTransition(slotName, willBe, this.getRelevantAppKind(appName, slotName));

        return isActive;
    }

    /**
     * Kept-alive apps that the current route lists again with other props than they were hidden with.
     * They are handled like apps with changed props: "update" lifecycle when the app has one,
     * otherwise a remount.
     */
    #getKeptAliveAppsWithDifferentProps(currentSlots) {
        return Object.entries(currentSlots).reduce((acc, [slotName, slotValue]) => {
            const changed = getSlotEntries(slotValue)
                .filter((entry) => {
                    const kept = this.#keptAlive.get(makeAppId(entry.appName, slotName));
                    const wasListed = (this.#activeApps.prev[slotName] || []).includes(entry.appName);

                    return kept !== undefined && !wasListed && kept.routeProps !== JSON.stringify(entry.props || {});
                })
                .map((entry) => ({ appName: entry.appName, slotName }));

            return [...acc, ...changed];
        }, []);
    }

    #isKeepAliveEntry(route, slotName, appName) {
        const entry = this.#findSlotEntry(route, slotName, appName);

        return Boolean(entry && entry.keepAlive);
    }

    #setAppVisibility(appId, appName, slotName, visible) {
        const container = document.querySelector(`[data-ilc-app-id="${appId.replace(/"/g, '\\"')}"]`);

        if (container && (container.style.display === 'none') === !visible) {
            // already in the requested state: single-spa runs the activity functions more than once per change
            return;
        }

        if (container) {
            container.style.display = visible ? '' : 'none';

            if (visible) {
                const orderedAppIds = getSlotEntries(this.#currentRoute.slots[slotName]).map((entry) =>
                    makeAppId(entry.appName, slotName),
                );
                placeAppContainer(container.parentNode, container, orderedAppIds);
            }
        }

        this.#debug(`keep-alive: "${appId}" ${visible ? 'shown' : 'hidden'}`);

        window.dispatchEvent(
            new CustomEvent(ilcEvents.APP_VISIBILITY, {
                detail: { appId, appName, slotName, visible },
            }),
        );
    }

    /**
     * The entry of one app in one slot of a route; a slot holds one app or an ordered list of apps.
     */
    #findSlotEntry(route, slotName, appName) {
        const entries = route && route.slots ? getSlotEntries(route.slots[slotName]) : [];

        return entries.find((entry) => entry.appName === appName);
    }

    #getRouteProps(appName, slotName, route) {
        const appConfig = this.#ilcConfigRoot.getConfigForAppByName(appName);
        const routeConfig = this.#findSlotEntry(route, slotName, appName);

        if (appConfig === undefined) {
            throw new this.errors.RouterError({ message: 'Can not find info about the app.', data: { appName } });
        }

        if (routeConfig === undefined) {
            const kept = this.#keptAlive.get(makeAppId(appName, slotName));

            if (kept) {
                // A hidden kept-alive app keeps the props it was last shown with.
                return kept.mergedProps;
            }

            throw new this.errors.RouterError({ message: 'Can not find info about the slot.', data: { slotName } });
        }
        // ILC-level props for the app/slot. `appConfig.props` is the app's registry
        // config; the user-app props live under a nested `appProps` key (below).
        const appConfigProps = appConfig.props || {};
        const routeProps = routeConfig.props || {};

        // Carry the experiment assignments (resolved once at SSR and inlined into
        // ilcState) into every app's props on client-side navigation. They go under the
        // nested `appProps` key — the same place the server uses (server-router.js) and
        // the field a client consumer reads via getCurrentPathProps().appProps —
        // so a freshly client-mounted app still receives the already-resolved assignment.
        // This reuses the existing value (never re-buckets), keeping the assignment stable
        // across all apps in a long-lived SPA session.
        //
        // Note: SSR-rendered (primary) apps already get experiments via the server SSR
        // appProps, so this client-side merge is the forward-looking half of that same
        // contract — it is what delivers the assignment to apps mounted purely on the
        // client (no SSR). It is a no-op when ilcState carries no experiments.
        const { experiments } = this.#ilcState;
        const experimentsProps = experiments ? { appProps: { experiments } } : {};

        return deepmerge.all([appConfigProps, routeProps, experimentsProps]);
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
                    'Please open an issue if you need this functionality.',
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
        this.#windowEventHandlers[ilcEvents.BEFORE_ROUTING] = this.#onSingleSpaRoutingEvents;
        this.#windowEventHandlers[ilcEvents.NOT_FOUND] = this.render404;

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

        // In case if base template was changes we expect not SPA navigation
        const isBaseTemplateChanged = this.#currentRoute && this.#prevRoute.template !== this.#currentRoute.template;
        if (isBaseTemplateChanged) {
            this.#location.href = this.#currentUrl;
            return;
        }

        this.#activeApps.prev = this.#createActiveAppsObject(this.#prevRoute.slots);
        this.#activeApps.current = this.#createActiveAppsObject(this.#currentRoute.slots);

        const appsWithDifferentProps = [
            ...this.#getAppsWithDifferentProps(this.#prevRoute.slots, this.#currentRoute.slots),
            ...this.#getKeptAliveAppsWithDifferentProps(this.#currentRoute.slots),
        ];
        if (appsWithDifferentProps.length) {
            const appsToForceRerender = [];
            const updateEventsToTrigger = [];

            appsWithDifferentProps.forEach(({ slotName, appName }) => {
                const eventUpdateFragment = ilcEvents.updateAppInSlot(slotName, appName);

                // if fragment provided "update" lifecycle method then it will be updated immediately w/o remounting app
                // otherwise the fragment will be unmounted and mounted with new props
                if (this.listenerCount(eventUpdateFragment)) {
                    updateEventsToTrigger.push(eventUpdateFragment);
                } else {
                    // temporary remove the app with old props from the slot, to remove it from DOM
                    // it will be rendered with new props with the help of "triggerAppChange"
                    appsToForceRerender.push(appName);
                    // a kept-alive app with new props and no "update" lifecycle is remounted like any other
                    this.#keptAlive.delete(makeAppId(appName, slotName));
                    this.#activeApps.current[slotName] = this.#activeApps.current[slotName].filter(
                        (activeAppName) => activeAppName !== appName,
                    );
                }
            });

            window.addEventListener(
                ilcEvents.PAGE_READY,
                () => {
                    if (appsToForceRerender.length) {
                        this.#logger.info(
                            `ILC: Triggering app re-mount for [${appsToForceRerender}] due to changed props.`,
                        );

                        triggerAppChange();
                    }

                    if (updateEventsToTrigger.length) {
                        updateEventsToTrigger.forEach(this.emit.bind(this));
                    }
                },
                { once: true },
            );
        }
    };

    /** slot name -> names of the apps the route puts into it, in order */
    #createActiveAppsObject(slots) {
        return Object.entries(slots).reduce((acc, [slotName, slotValue]) => {
            acc[slotName] = getSlotEntries(slotValue).map((entry) => entry.appName);
            return acc;
        }, {});
    }

    #getAppsWithDifferentProps(prevSlots, currentSlots) {
        return Object.entries(prevSlots).reduce((acc, [slotName, prevSlotValue]) => {
            const currentEntries = getSlotEntries(currentSlots[slotName]);

            if (!currentEntries.length) {
                return acc;
            }

            const changed = getSlotEntries(prevSlotValue)
                .map((prevEntry) => ({
                    prevEntry,
                    currentEntry: currentEntries.find((entry) => entry.appName === prevEntry.appName),
                }))
                .filter(
                    ({ prevEntry, currentEntry }) =>
                        currentEntry !== undefined &&
                        JSON.stringify(prevEntry.props) !== JSON.stringify(currentEntry.props),
                )
                .map(({ currentEntry }) => ({ appName: currentEntry.appName, slotName }));

            return [...acc, ...changed];
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

        const anchor = event.target.tagName === 'A' ? event.target : event.target.closest('a');
        const href = anchor && anchor.getAttribute('href');

        if (event.defaultPrevented || href === null || !['', '_self'].includes(anchor.target) || isSpecialUrl(href)) {
            return;
        }

        const { specialRole } = this.match(href);
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
                    `Currently mounted apps: ${mountedApps.join(', ')}.`,
            );
        }

        const { appName, slotName } = appIdToNameAndSlot(appId);
        const fragmentKind = this.getRelevantAppKind(appName, slotName);
        const isPrimary = fragmentKind === FRAGMENT_KIND.primary;

        if (specialRouteId === 404 && !isPrimary) {
            return this.#logger.warn(
                `ILC: Ignoring special route "${specialRouteId}" trigger which came from non-primary app "${appId}". ` +
                    `"${appId}" is "${fragmentKind}"`,
            );
        }

        this.#logger.info(
            `ILC: Special route "${specialRouteId}" was triggered by "${appId}" app. Performing rerouting...`,
        );

        this.#forceSpecialRoute = { id: specialRouteId, url: this.#getCurrUrl(true) };

        triggerAppChange(); //This call would immediately invoke "ilc:before-routing" and start apps mount/unmount process
    };

    #getCurrUrl = (withLocale = false) => {
        const url = this.#location.pathname + this.#location.search;

        if (withLocale) {
            return url;
        }

        return this.#i18n.unlocalizeUrl(url);
    };
}
