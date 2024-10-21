import ilcEvents from './constants/ilcEvents';

export class CssTrackedApp {
    #originalApp;
    #cssLinkUri;
    #delayCssRemoval;
    // used to prevent removing CSS immediately after unmounting
    #isRouteChanged = false;
    #routeChangeListener;

    static linkUsagesAttribute = 'data-ilc-usages';
    static markedForRemovalAttribute = 'data-ilc-remove';

    /**
     * @param {{unmount?: () => Promise, update: () => Promise, bootstrap: () => Promise, mount: () => Promise, createNew?: () => Promise}} originalApp
     * @param {string} cssLink
     * @param {Boolean} delayCssRemoval
     */
    constructor(originalApp, cssLink, delayCssRemoval) {
        this.#originalApp = originalApp;
        // this assumes that we always have 1 link to CSS from one application
        // real life might differ at some time
        this.#cssLinkUri = cssLink;
        this.#delayCssRemoval = delayCssRemoval;

        if (!delayCssRemoval) {
            // While CSS for an application rendered by another application is not always immediately necessary upon unmount, there is a non-trivial case to consider:
            // - When the route changes and a spinner is enabled in the registry, the root application is unmounted and destroyed.
            // - ILC then shows a copy of the previously rendered DOM node.
            // - Which leads to a situation where both the root and inner applications unmount synchronously. Despite being unmounted, their styles are still required until the route transition is complete.
            this.#addRouteChangeListener();
        }
    }

    getDecoratedApp = () => {
        return {
            ...this.#originalApp,
            createNew: typeof this.#originalApp.createNew === 'function' ? this.createNew : this.#originalApp.createNew,
            mount: this.mount,
            unmount: this.unmount,
            update: this.update,
            __CSS_TRACKED_APP__: true,
        };
    };

    createNew = (...args) => {
        if (!this.#originalApp.createNew) {
            return undefined;
        }

        const newInstanceResult = this.#originalApp.createNew(...args);
        // if createNew does not return Promise it is not expected for dynamic apps
        if (typeof newInstanceResult.then !== 'function') {
            return newInstanceResult;
        }

        return newInstanceResult.then((newInstance) => {
            const isIlcAdapter = ['mount', 'unmount', 'bootstrap'].every((m) => typeof newInstance[m] === 'function');
            if (!isIlcAdapter) {
                return newInstance;
            }

            return new CssTrackedApp(newInstance, this.#cssLinkUri, false).getDecoratedApp();
        });
    };

    mount = async (...args) => {
        const link = this.#findLink();
        if (link === null) {
            await this.#appendCssLink();
        } else {
            const numberOfUsages = this.#getNumberOfLinkUsages(link);
            link.setAttribute(CssTrackedApp.linkUsagesAttribute, (numberOfUsages + 1).toString());
            link.removeAttribute(CssTrackedApp.markedForRemovalAttribute);
        }

        return await this.#originalApp.mount(...args);
    };

    unmount = async (...args) => {
        try {
            return this.#originalApp.unmount(...args);
        } finally {
            const link = this.#findLink();
            if (link != null) {
                this.#decrementOrRemoveCssUsages(link);
            }
            this.#removeRouteChangeListener();
        }
    };

    update = async (...args) => {
        if (!this.#originalApp.update) {
            return undefined;
        }

        return this.#originalApp.update(...args);
    };

    static removeAllNodesPendingRemoval() {
        const allNodes = document.querySelectorAll(`link[${CssTrackedApp.markedForRemovalAttribute}]`);
        Array.from(allNodes).forEach((node) => node.remove());
    }

    #appendCssLink() {
        return new Promise((resolve, reject) => {
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = this.#cssLinkUri;
            newLink.setAttribute(CssTrackedApp.linkUsagesAttribute, '1');
            newLink.onload = () => resolve();
            newLink.onerror = () => reject();
            document.head.appendChild(newLink);
        });
    }

    #decrementOrRemoveCssUsages(link) {
        const numberOfUsages = this.#getNumberOfLinkUsages(link);
        if (numberOfUsages <= 1) {
            this.#handleLinkRemoval(link);
        } else {
            link.setAttribute(CssTrackedApp.linkUsagesAttribute, (numberOfUsages - 1).toString());
        }
    }

    #handleLinkRemoval(link) {
        if (this.#shouldDelayRemoval()) {
            this.#markLinkForRemoval(link);
        } else {
            link.remove();
        }
    }

    #shouldDelayRemoval() {
        // If the route is changing, we should delay CSS removal to prevent visual glitches.
        return this.#delayCssRemoval || this.#isRouteChanged;
    }

    #markLinkForRemoval(link) {
        link.removeAttribute(CssTrackedApp.linkUsagesAttribute);
        link.setAttribute(CssTrackedApp.markedForRemovalAttribute, 'true');
    }

    #getNumberOfLinkUsages(link) {
        const existingValue = link.getAttribute(CssTrackedApp.linkUsagesAttribute);
        return existingValue === null ? 0 : parseInt(existingValue, 10);
    }

    #findLink() {
        return document.querySelector(`link[href="${this.#cssLinkUri}"]`);
    }

    #handleRouteChange() {
        this.#isRouteChanged = true;
    }

    #addRouteChangeListener() {
        if (!this.#routeChangeListener) {
            this.#routeChangeListener = this.#handleRouteChange.bind(this);
            window.addEventListener(ilcEvents.BEFORE_ROUTING, this.#routeChangeListener);
        }
    }

    #removeRouteChangeListener() {
        if (this.#routeChangeListener) {
            window.removeEventListener(ilcEvents.BEFORE_ROUTING, this.#routeChangeListener);
            this.#routeChangeListener = null;
        }
    }
}
