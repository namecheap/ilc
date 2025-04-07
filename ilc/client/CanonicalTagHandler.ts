import { IlcIntl } from 'ilc-sdk/app';
import singleSpaEvents from './constants/singleSpaEvents';
import { removeQueryParams } from '../common/utils';
import { Route } from '../server/types/RegistryConfig';
import type { Logger } from 'ilc-plugins-sdk';

interface ClientRouter {
    getCurrentRoute(): Route;
}

export class CanonicalTagHandler {
    constructor(
        private readonly i18n: IlcIntl,
        private readonly logger: Logger,
        private readonly router: ClientRouter,
    ) {}

    start(): void {
        window.addEventListener(singleSpaEvents.ROUTING_EVENT, this.handleRoutingChange as EventListener);
    }

    stop(): void {
        window.removeEventListener(singleSpaEvents.ROUTING_EVENT, this.handleRoutingChange as EventListener);
    }

    private handleRoutingChange = (event: Event): void => {
        const canonicalTag = document.querySelector('link[rel="canonical"][data-ilc="1"]');
        if (!canonicalTag) {
            this.logger.error('CanonicalTagHandler: Can not find canonical tag on the page');
            return;
        }

        const url = removeQueryParams((event.target as any)?.location?.href);
        let canonicalUrl = this.determineCanonicalUrl(url);
        const localizedUrl = this.i18n ? this.i18n.localizeUrl(canonicalUrl) : canonicalUrl;

        canonicalTag.setAttribute('href', localizedUrl);
    };

    /**
     * Determines the canonical URL based on router configuration
     *
     * @param defaultUrl - Default URL to use if no canonical URL is configured
     * @returns The canonical URL
     */
    private determineCanonicalUrl(defaultUrl: string): string {
        try {
            const currentRoute = this.router.getCurrentRoute();
            const routeCanonicalUrl = currentRoute.meta?.canonicalUrl;

            if (!routeCanonicalUrl) {
                return defaultUrl;
            }

            const origin = window.location.origin;

            return `${origin}${routeCanonicalUrl.startsWith('/') ? '' : '/'}${routeCanonicalUrl}`;
        } catch (error) {
            this.logger.error('CanonicalTagHandler: Error getting current route', error as Error);
            return defaultUrl;
        }
    }
}
