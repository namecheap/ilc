import deepmerge from 'deepmerge';

import * as Router from '../common/router/Router';
import * as errors from '../common/router/errors';

export default class ClientRouter {
    errors = errors;

    #currentUrl;
    #navigateToUrl;
    #location;
    #logger;
    #registryConf;
    /** @type Object<Router> */
    #router;
    #prevRoute;
    #currentRoute;

    constructor(registryConf, state, navigateToUrl, location = window.location, logger = window.console) {
        this.#navigateToUrl = navigateToUrl;
        this.#location = location;
        this.#logger = logger;
        this.#registryConf = registryConf;
        this.#router = new Router(registryConf);
        this.#currentUrl = this.#location.pathname + this.#location.search;

        this.#setInitialRoutes(state);
        this.#addEventListeners();
    }

    getPrevRoute = () => this.#prevRoute;
    getCurrentRoute = () => this.#currentRoute;

    getPrevRouteProps = (appName, slotName) => this.#getRouteProps(appName, slotName, this.#prevRoute);
    getCurrentRouteProps = (appName, slotName) => this.#getRouteProps(appName, slotName, this.#currentRoute);

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
        const path = this.#location.pathname + this.#location.search;

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
            this.#currentRoute = this.#router.matchSpecial(path, state.forceSpecialRoute);
        } else {
            this.#currentRoute = this.#router.match(path);
        }

        this.#prevRoute = this.#currentRoute;
    };

    #addEventListeners = () => {
        window.addEventListener('single-spa:before-routing-event', this.#onSingleSpaRoutingEvents);
        document.addEventListener('click', this.#onClickLink);
    };

    removeEventListeners() {
        window.removeEventListener('single-spa:before-routing-event', this.#onSingleSpaRoutingEvents);
        document.removeEventListener('click', this.#onClickLink);
    }

    #onSingleSpaRoutingEvents = () => {
        this.#prevRoute = this.#currentRoute;

        // fix for google cached pages.
        // if open any cached page and scroll to "#features" section:
        // only hash will be changed so router.match will return error, since <base> tag has already been removed.
        // so in this cases we shouldn't regenerate currentRoute
        const newUrl = this.#location.pathname + this.#location.search;
        if (this.#currentUrl !== newUrl) {
            this.#currentRoute = this.#router.match(this.#location.pathname + this.#location.search);
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
    };

    #onClickLink = (event) => {
        const anchor = event.target.tagName === 'A'
            ? event.target
            : event.target.closest('a');
        const href = anchor && anchor.getAttribute('href');

        if (event.defaultPrevented || !href) {
            return;
        }

        const pathname = href.replace(this.#location.origin, '');
        const {specialRole} = this.#router.match(pathname);

        if (specialRole === null) {
            this.#navigateToUrl(href);
            event.preventDefault();
        }
    };
}
