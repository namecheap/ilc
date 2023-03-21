import { IlcIntl } from 'ilc-sdk/app';
import singleSpaEvents from './constants/singleSpaEvents';
import { removeQueryParams } from '../common/utils';

export class CanonicalTagHandler {
    #logger = null;
    #i18n = null;

    constructor(i18n, logger) {
        this.#logger = logger;
        this.#i18n = i18n;
    }

    start() {
        window.addEventListener(singleSpaEvents.ROUTING_EVENT, this.#handleRoutingChange);
    }

    stop() {
        window.removeEventListener(singleSpaEvents.ROUTING_EVENT, this.#handleRoutingChange);
    }

    #handleRoutingChange = (event) => {
        const url = removeQueryParams(event.target.location.href);
        const canonicalTag = document.querySelector('link[rel="canonical"][data-ilc="1"]');
        const localizedUrl = this.#i18n ? this.#i18n.localizeUrl(url) : url;

        if (canonicalTag && canonicalTag.setAttribute) {
            canonicalTag.setAttribute('href', localizedUrl);
        } else {
            this.#logger.error('CanonicalTagHandler: Can not find canonical tag on the page');
        }
    };
}
