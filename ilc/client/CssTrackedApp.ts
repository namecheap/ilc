import ilcEvents from './constants/ilcEvents';
import { ILCAdapter } from './types/ILCAdapter';
import { AppConfig } from './types/AppConfig';
import { CssTrackedOptions } from './types/CssTrackedOptions';
import { DecoratedApp } from './types/DecoratedApp';

export interface CreateNewArgs {
    appConfig?: AppConfig;
}

type RouteChangeCallback = () => void;

type CreateNewReturnType = Promise<ILCAdapter> | undefined | any;

export class CssTrackedApp {
    static readonly linkUsagesAttribute: string = 'data-ilc-usages';
    static readonly markedForRemovalAttribute: string = 'data-ilc-remove';

    private originalApp: ILCAdapter;
    private cssLinkUri: string;
    // used to prevent removing CSS immediately after unmounting
    private isRouteChanged: boolean = false;
    private routeChangeListener?: RouteChangeCallback;
    private options: Required<CssTrackedOptions>;

    constructor(originalApp: ILCAdapter, cssLink: string, options: CssTrackedOptions = {}) {
        const defaultOptions: Required<CssTrackedOptions> = {
            removeCssTimeout: 300,
            delayCssRemoval: false,
        };

        this.originalApp = originalApp;
        // this assumes that we always have 1 link to CSS from one application
        // real life might differ at some time
        this.cssLinkUri = cssLink;
        this.options = { ...defaultOptions, ...options };

        if (!this.options.delayCssRemoval) {
            // While CSS for an application rendered by another application is not always immediately necessary upon unmount,
            // there is a non-trivial case to consider:
            // - When the route changes and a spinner is enabled in the registry, the root application is unmounted and destroyed.
            // - ILC then shows a copy of the previously rendered DOM node.
            // - Which leads to a situation where both the root and inner applications unmount synchronously.
            // Despite being unmounted, their styles are still required until the route transition is complete.
            this.addRouteChangeListener();
        }
    }

    getDecoratedApp = (): DecoratedApp => {
        return {
            ...this.originalApp,
            createNew: typeof this.originalApp.createNew === 'function' ? this.createNew : this.originalApp.createNew,
            mount: this.mount,
            unmount: this.unmount,
            update: this.update,
            __CSS_TRACKED_APP__: true,
        };
    };

    createNew = (...args: [CreateNewArgs, ...any[]]): CreateNewReturnType => {
        if (!this.originalApp.createNew) {
            return undefined;
        }

        const newInstanceResult = this.originalApp.createNew(...args);
        // if createNew does not return Promise it is not expected for dynamic apps
        if (typeof newInstanceResult.then !== 'function') {
            return newInstanceResult;
        }

        const [{ appConfig: { removeCssTimeout } = {} } = {}] = args;

        return newInstanceResult.then((newInstance: ILCAdapter) => {
            const requiredMethods: (keyof ILCAdapter)[] = ['mount', 'unmount', 'bootstrap'];
            const isIlcAdapter = requiredMethods.every((m) => typeof newInstance[m] === 'function');
            if (!isIlcAdapter) {
                return newInstance;
            }

            return new CssTrackedApp(newInstance, this.cssLinkUri, {
                removeCssTimeout,
                delayCssRemoval: this.options.delayCssRemoval,
            }).getDecoratedApp();
        });
    };

    mount = async (...args: any[]): Promise<any> => {
        const link = this.findLink();
        if (link === null) {
            await this.appendCssLink();
        } else {
            const numberOfUsages = this.getNumberOfLinkUsages(link);
            link.setAttribute(CssTrackedApp.linkUsagesAttribute, (numberOfUsages + 1).toString());
            link.removeAttribute(CssTrackedApp.markedForRemovalAttribute);
        }

        return await this.originalApp.mount(...args);
    };

    unmount = async (...args: any[]): Promise<any> => {
        try {
            return this.originalApp.unmount(...args);
        } finally {
            const link = this.findLink();
            if (link != null) {
                this.decrementOrRemoveCssUsages(link);
            }
            this.removeRouteChangeListener();
        }
    };

    update = async (...args: any[]): Promise<any | undefined> => {
        if (!this.originalApp.update) {
            return undefined;
        }

        return this.originalApp.update(...args);
    };

    static removeAllNodesPendingRemoval(): void {
        const allNodes = document.querySelectorAll(`link[${CssTrackedApp.markedForRemovalAttribute}]`);
        Array.from(allNodes).forEach((node) => node.remove());
    }

    private appendCssLink(): Promise<void> {
        return new Promise((resolve, reject) => {
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = this.cssLinkUri;
            newLink.setAttribute(CssTrackedApp.linkUsagesAttribute, '1');
            newLink.onload = () => resolve();
            newLink.onerror = () => reject();
            document.head.appendChild(newLink);
        });
    }

    private decrementOrRemoveCssUsages(link: HTMLLinkElement): void {
        const numberOfUsages = this.getNumberOfLinkUsages(link);
        if (numberOfUsages <= 1) {
            this.handleLinkRemoval(link);
        } else {
            link.setAttribute(CssTrackedApp.linkUsagesAttribute, (numberOfUsages - 1).toString());
        }
    }

    private handleLinkRemoval(link: HTMLLinkElement): void {
        if (this.shouldDelayRemoval()) {
            this.markLinkForRemoval(link);
        } else {
            /**
             * Embedded app might be wrapped by HOC that creates a clone of elements during transitions.
             * We delay CSS removal to ensure both original and cloned elements
             * are properly styled until the transition completes */
            if (this.options.removeCssTimeout > 0) {
                setTimeout(() => link.remove(), this.options.removeCssTimeout);
            } else {
                link.remove();
            }
        }
    }

    private shouldDelayRemoval(): boolean {
        // If the route is changing, we should delay CSS removal to prevent visual glitches.
        return this.options.delayCssRemoval || this.isRouteChanged;
    }

    private markLinkForRemoval(link: HTMLLinkElement): void {
        link.removeAttribute(CssTrackedApp.linkUsagesAttribute);
        link.setAttribute(CssTrackedApp.markedForRemovalAttribute, 'true');
    }

    private getNumberOfLinkUsages(link: HTMLLinkElement): number {
        const existingValue = link.getAttribute(CssTrackedApp.linkUsagesAttribute);
        return existingValue === null ? 0 : parseInt(existingValue, 10);
    }

    private findLink(): HTMLLinkElement | null {
        return document.querySelector(`link[href="${this.cssLinkUri}"]`);
    }

    private handleRouteChange(): void {
        this.isRouteChanged = true;
    }

    private addRouteChangeListener(): void {
        if (!this.routeChangeListener) {
            this.routeChangeListener = this.handleRouteChange.bind(this);
            window.addEventListener(ilcEvents.BEFORE_ROUTING, this.routeChangeListener);
        }
    }

    private removeRouteChangeListener(): void {
        if (this.routeChangeListener) {
            window.removeEventListener(ilcEvents.BEFORE_ROUTING, this.routeChangeListener);
            this.routeChangeListener = undefined;
        }
    }
}
