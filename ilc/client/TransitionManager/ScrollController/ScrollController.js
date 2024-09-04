export class ScrollController {
    // @todo write e2e tests for hash position restoring
    #hashStoreAttribute = 'ilcTempStoredHash';
    #lastVisitedUrl = this.location.pathname;
    #shouldScrollToTop = true;

    get location() {
        return window.location;
    }

    onEveryRouteChange() {
        this.#shouldScrollToTop = this.#lastVisitedUrl.toLowerCase() !== this.location.pathname.toLowerCase();
        this.#lastVisitedUrl = this.location.pathname;
    }

    store() {
        if (this.location.hash) {
            const node = this.#getHashStoreNode();
            const hashValue = this.#getHashValue();
            node.setAttribute(this.#hashStoreAttribute, hashValue);
        }
    }

    restore() {
        const node = this.#getHashStoreNode();
        // @todo: looks like it never used so storing is useless
        node.removeAttribute(this.#hashStoreAttribute);

        this.#restoreScrollOnNavigation();
    }

    #getHashStoreNode() {
        return document.body;
    }

    #restoreScrollOnNavigation() {
        let scrollToElement;
        if (this.location.hash) {
            scrollToElement = document.getElementById(this.#getHashValue());
        }

        if (scrollToElement) {
            scrollToElement.scrollIntoView();
            return;
        }

        if (this.#shouldScrollToTop) {
            window.scroll(0, 0);
        }
    }

    #getHashValue() {
        try {
            return decodeURIComponent(this.location.hash.slice(1));
        } catch (error) {
            // @todo handle an error the hash should not be read if it not exists
            return false;
        }
    }
}
