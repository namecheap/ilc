import config from 'config';
import { IlcIntl, IntlAdapterConfig } from 'ilc-sdk/app';
import { context } from '../context/context';
import { removeQueryParams, addTrailingSlash } from '../../common/utils';
import { RouteMeta } from '../../common/types/Router';

export class CanonicalTagService {
    /**
     * Generates canonical tag HTML based on URL and route configuration
     *
     * @param url - The current URL
     * @param locale - The current locale
     * @param i18nConfig - i18n configuration
     * @param routeMeta - Optional route meta data that may contain canonicalUrl
     * @returns HTML for canonical tag
     */
    static getCanonicalTagForUrlAsHTML(
        url: string,
        locale: string | undefined,
        i18nConfig: IntlAdapterConfig,
        routeMeta: RouteMeta = {},
    ): string {
        let targetUrl = url;

        // Use custom canonical URL if provided and it's relative
        if (routeMeta.canonicalUrl) {
            targetUrl = routeMeta.canonicalUrl;
        }

        const store = context.getStore();
        const domain = store.get('domain');
        const protocol = config.get<string>('client.protocol');
        const effectiveLocale = locale || i18nConfig.default?.locale;

        const fullUrl = removeQueryParams(`${protocol}://${domain}${targetUrl}`);

        return this.#generateCanonicalTag(fullUrl, i18nConfig, effectiveLocale);
    }

    static #generateCanonicalTag(url: string, i18nConfig: IntlAdapterConfig, locale: string | undefined): string {
        const localizedUrl = IlcIntl.localizeUrl(i18nConfig, url, { locale });
        return `<link rel="canonical" href="${addTrailingSlash(localizedUrl)}" data-ilc="1" />`;
    }
}
