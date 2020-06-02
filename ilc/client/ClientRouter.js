import deepmerge from 'deepmerge';
import * as singleSpa from 'single-spa';

import * as Router from '../common/router/Router';
import * as errors from '../common/router/errors';

export default class ClientRouter {
    errors = errors;

    #location;
    #logger;
    #registryConf;
    #router;
    #prevRoute;
    #currentRoute;

    constructor(registryConf, logger = window.console, location = window.location) {
        this.#location = location;
        this.#logger = logger;
        this.#registryConf = registryConf;
        this.#router = new Router(registryConf);

        this.#setInitialRoutes();
        this.#handleSingleSpaRoutingEvents();
        this.#handleLinks();
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

    #setInitialRoutes = () => {
        // we should respect base tag for cached pages
        let path;
        const base = document.querySelector('base');

        if (base) {
            const a = document.createElement('a');
            a.href = base.getAttribute('href');
            path = a.pathname + a.search;

            base.remove();
            this.#logger.warn('ILC: <base> tag was used only for initial rendering & removed afterwards. Currently we\'re not respecting it fully. Pls open an issue if you need this functionality.');
        } else {
            path = this.#location.pathname + this.#location.search;
        }

        this.#currentRoute = this.#router.match(path);
        this.#prevRoute = this.#currentRoute;
    };

    #handleSingleSpaRoutingEvents = () => {
        let currentUrl = this.#location.pathname + this.#location.search;
        window.addEventListener('single-spa:before-routing-event', () => {
            this.#prevRoute = this.#currentRoute;

            // fix for google cached pages.
            // if open any cached page and scroll to "#features" section:
            // only hash will be changed so router.match will return error, since <base> tag has already been removed.
            // so in this cases we shouldn't regenerate currentRoute
            const newUrl = this.#location.pathname + this.#location.search;
            if (currentUrl !== newUrl) {
                this.#currentRoute = this.#router.match(this.#location.pathname + this.#location.search);
                currentUrl = newUrl;
            }

            if (this.#currentRoute && this.#prevRoute.template !== this.#currentRoute.template) {
                throw new Error('Base template was changed and I still don\'t know how to handle it :(');
            }
        });
    };

    #handleLinks = () => {
        document.addEventListener('click', e => {
            const anchor = e.target.tagName === 'A'
                ? e.target
                : e.target.closest('a');
            const href = anchor && anchor.getAttribute('href');

            if (e.defaultPrevented === true || !href) {
                return;
            }

            const pathname = href.replace(this.#location.origin, '');
            const { specialRole } = this.#router.match(pathname);

            if (specialRole === null) {
                singleSpa.navigateToUrl(pathname);
                e.preventDefault();
            }
        });
    };
}
