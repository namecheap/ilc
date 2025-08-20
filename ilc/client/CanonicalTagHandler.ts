import { IlcIntl } from 'ilc-sdk/app';
import singleSpaEvents from './constants/singleSpaEvents';
import { removeQueryParams } from '../common/utils';
import { ClientRouter } from '../common/types/Router';
import type { Logger } from 'ilc-plugins-sdk';

export class CanonicalTagHandler {
    constructor(
        private readonly i18n: IlcIntl,
        private readonly logger: Logger,
        private readonly router: ClientRouter,
        private readonly canonicalDomain?: string,
    ) {}

    start(): void {
        window.addEventListener(singleSpaEvents.ROUTING_EVENT, this.handleRoutingChange);
    }

    stop(): void {
        window.removeEventListener(singleSpaEvents.ROUTING_EVENT, this.handleRoutingChange);
    }

    private handleRoutingChange = (event: Event): void => {
        const canonicalTag = this.findCanonicalTag();
        if (!canonicalTag) {
            return;
        }

        let url = removeQueryParams((event.target as any)?.location?.href);
        if (this.canonicalDomain && url) {
            const urlObj = new URL(url);
            urlObj.host = this.canonicalDomain;
            url = urlObj.toString();
        }
        let canonicalUrl = this.determineCanonicalUrl(url);
        const localizedUrl = this.i18n ? this.i18n.localizeUrl(canonicalUrl) : canonicalUrl;

        canonicalTag.setAttribute('href', localizedUrl);
    };

    /**
     * Finds the canonical tag in the document
     *
     * @returns The canonical tag element or null if not found
     */
    private findCanonicalTag(): HTMLLinkElement | null {
        const canonicalTag = document.querySelector('link[rel="canonical"][data-ilc="1"]');
        if (!canonicalTag) {
            this.logger.error('CanonicalTagHandler: Can not find canonical tag on the page');
            return null;
        }
        return canonicalTag as HTMLLinkElement;
    }

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

            const origin = defaultUrl ? new URL(defaultUrl).origin : window.location.origin;

            return `${origin}${routeCanonicalUrl.startsWith('/') ? '' : '/'}${routeCanonicalUrl}`;
        } catch (error) {
            this.logger.error('CanonicalTagHandler: Error getting current route', error as Error);
            return defaultUrl;
        }
    }
}
