import * as singleSpa from 'single-spa';
import * as Router from './Router';
import deepmerge from 'deepmerge';

export default class ClientRouter {
    #registryConf;
    #router;
    #prevRoute;
    #currentRoute;

    constructor(registryConf) {
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
        const appProps = this.#registryConf.apps[appName].props || {};
        const routeProps = route.slots[slotName] && route.slots[slotName].props || {};
        return deepmerge(appProps, routeProps);
    }

    #setInitialRoutes = () => {
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

        this.#currentRoute = this.#router.match(path);
        this.#prevRoute = this.#currentRoute;
    };

    #handleSingleSpaRoutingEvents = () => {
        let currentUrl = window.location.pathname + window.location.search;
        window.addEventListener('single-spa:before-routing-event', () => {
            this.#prevRoute = this.#currentRoute;

            // fix for google cached pages.
            // if open any cached page and scroll to "#features"
            // url changed and <base> tag has already removed and router.match will return error
            // so in this case we shouldn't regenerate currentRoute
            const newUrl = window.location.pathname + window.location.search
            if (currentUrl !== newUrl) {
                this.#currentRoute = this.#router.match(window.location.pathname + window.location.search);
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

            const pathname = href.replace(window.location.origin, '');

            const { specialRole } = this.#router.match(pathname);

            if (specialRole === null) {
                singleSpa.navigateToUrl(pathname);
                e.preventDefault();
            }
        });
    };
}
