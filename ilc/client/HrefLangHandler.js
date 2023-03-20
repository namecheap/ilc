import singleSpaEvents from './constants/singleSpaEvents';
import { IlcIntl } from 'ilc-sdk/app';

export class HrefLangHandler {
    #i18nConfig = null;
    #supportedLang = null;
    #defaultHrefLangValue = 'x-default';
    #logger = null;

    constructor(i18nConfig, logger) {
        this.#supportedLang = i18nConfig?.supported?.locale || [];
        this.#i18nConfig = i18nConfig;
        this.#logger = logger;
    }

    start() {
        window.addEventListener(singleSpaEvents.ROUTING_EVENT, this.#handleRoutingChange);
    }

    stop() {
        window.removeEventListener(singleSpaEvents.ROUTING_EVENT, this.#handleRoutingChange);
    }

    #handleRoutingChange = (event) => {
        const url = this.#getUrlWithoutSearchParams(event.target.location.href);
        const hrefLinks = document.querySelectorAll('link[rel="alternate"][data-ilc="1"][hreflang]');

        hrefLinks.forEach((linkTag) => {
            try {
                const lang = linkTag.getAttribute('hreflang');
                let localizedUrl = null;

                if (lang === this.#defaultHrefLangValue) {
                    localizedUrl = IlcIntl.localizeUrl(this.#i18nConfig, url, {
                        locale: this.#i18nConfig.default.locale,
                    });
                } else {
                    localizedUrl = IlcIntl.localizeUrl(this.#i18nConfig, url, { locale: lang });
                }

                linkTag.setAttribute('href', localizedUrl);
            } catch (error) {
                this.#logger.error('HrefLangHandler: Error while updating hreflang links', error);
            }
        });
    };

    #getUrlWithoutSearchParams(url) {
        const urlObject = new URL(url);
        urlObject.search = '';
        return urlObject.toString();
    }
}
