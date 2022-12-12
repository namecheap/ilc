export class UrlHashController {
    // @todo write e2e tests for hash position restoring
    #hashStoreNode = document.body;
    #hashStoreAttribute = 'ilcTempStoredHash';

    store() {
        if (window.location.hash) {
            const node = this.#hashStoreNode;
            const hashValue = this.#getHashValue();
            node.setAttribute(this.#hashStoreAttribute, hashValue);
        }
    }

    restore() {
        const node = this.#hashStoreNode;
        // @todo: looks like it never used so storing is useless
        node.removeAttribute(this.#hashStoreAttribute);
        this.#scrollToHash();
    }

    #scrollToHash() {
        let scrollToElement;

        if (window.location.hash) {
            scrollToElement = document.querySelector(window.location.hash);
        }

        if (scrollToElement) {
            scrollToElement.scrollIntoView();
        } else {
            window.scroll(0, 0);
        }
    }

    #getHashValue() {
        try {
            return window.location.hash.slice(1);
        } catch (error) {
            // @todo handle an error the hash should not be read if it not exists
            return false;
        }
    }
}
