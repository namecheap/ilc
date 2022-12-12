export class SlotRenderObserver {
    #observer;

    observe(targetNode, { onSlotReady }) {
        if (this.#observer) {
            throw new Error(
                'SlotRenderObserver instance is already observing a node. You have to create new instance to observer an other',
            );
        }

        if (this.#observer === null) {
            throw new Error('SlotRenderObserver  disconnected to create new observer create a new instance');
        }

        if (!onSlotReady) {
            throw new Error('SlotRenderObserver has to receive onSlotReady callback');
        }

        const status = {
            hasAddedNodes: false,
            hasTextOrOpticNodes: false,
            isAnyChildVisible: false,
        };

        this.#observer = new MutationObserver((mutationsList) => {
            if (!status.hasAddedNodes) {
                status.hasAddedNodes = !!mutationsList.find((mutation) => mutation.addedNodes.length);
            }

            // if we have rendered MS to DOM but meaningful content isn't rendered, e.g. due to essential data preload
            if (!status.hasTextOrOpticNodes) {
                const hasText = !!targetNode.innerText.trim().length;
                const hasOpticNodes = !!targetNode.querySelector(':not(div):not(span)');
                status.hasTextOrOpticNodes = hasText || hasOpticNodes;
            }

            // if we have rendered MS to DOM but temporary hide it for some reason, e.g. to fetch data
            if (!status.isAnyChildVisible) {
                status.isAnyChildVisible = Array.from(targetNode.children).some(
                    (node) => node.style.display !== 'none',
                );
            }

            if (Object.values(status).some((n) => !n)) return;

            onSlotReady();
        });

        this.#observer.observe(targetNode, { childList: true, subtree: true, attributeFilter: ['style'] });
    }

    disconnect() {
        if (!this.#observer) {
            //@todo report unexpected disconnection flow
            return;
        }
        this.#observer.disconnect();
        this.#observer = null;
    }
}
