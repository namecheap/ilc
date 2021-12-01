import { getSlotElement } from './utils';
import getIlcConfig from './ilcConfig';

import scrollRestorer from '@mapbox/scroll-restorer';

export const slotWillBe = {
    rendered: 'rendered',
    removed: 'removed',
    rerendered: 'rerendered',
    default: null,
};

export class TransactionManager {
    #spinnerConfig;
    #globalSpinner;
    #spinnerTimeout;

    #forceShowSpinner;
    #isSlotsLoadedEventFired;

    #fakeSlots = [];
    #hiddenSlots = [];
    #transactionBlockers = [];
    #windowEventHandlers = {};

    constructor(spinnerConfig = {enabled: true, customHTML: ''}) {
        this.#spinnerConfig = spinnerConfig;
        this.#addEventListeners();
    }

    handleAsyncAction(promise) {
        if (this.#spinnerConfig.enabled === false) {
            return;
        }

        this.#runGlobalSpinner();
        this.#transactionBlockers.push(promise);

        const afterPromise = () => this.#removeTransactionBlocker(promise);
        promise.then(afterPromise).catch(afterPromise)
    }

    handlePageTransaction(slotName, willBe) {
        if (this.#spinnerConfig.enabled === false) {
            return;
        }

        if (!slotName) {
            throw new Error('A slot name was not provided!');
        }

        switch (willBe) {
            case slotWillBe.rendered:
                this.#addContentListener(slotName);
                break;
            case slotWillBe.removed:
                this.#renderFakeSlot(slotName);
                break;
            case slotWillBe.rerendered:
                this.#renderFakeSlot(slotName);
                this.#addContentListener(slotName);
                break;
            case slotWillBe.default:
                break;
            default:
                throw new Error(`The slot action '${willBe}' did not match any possible values!`);
        }
    }

    #addContentListener = slotName => {
        this.#runGlobalSpinner();

        if (window.location.hash) {
            document.body.setAttribute('name', window.location.hash.slice(1));
        }

        const status = {
            hasAddedNodes: false,
            hasTextOrOpticNodes: false,
            isAnyChildVisible: false,
        };

        const observer = new MutationObserver((mutationsList, observer) => {
            if (!status.hasAddedNodes) {
                status.hasAddedNodes = !!mutationsList.find(mutation => mutation.addedNodes.length);
            }

            // if we have rendered MS to DOM but meaningful content isn't rendered, e.g. due to essential data preload
            if (!status.hasTextOrOpticNodes) {
                const hasText = !!targetNode.innerText.trim().length
                const hasOpticNodes = !!targetNode.querySelector(':not(div):not(span)');
                status.hasTextOrOpticNodes = hasText || hasOpticNodes;
            }

            // if we have rendered MS to DOM but temporary hide it for some reason, e.g. to fetch data
            if (!status.isAnyChildVisible) {
                status.isAnyChildVisible = Array.from(targetNode.children).some(node => node.style.display !== 'none');
            }

            if (Object.values(status).some(n => !n)) return;

            observer.disconnect();
            this.#removeTransactionBlocker(observer);
        });
        this.#transactionBlockers.push(observer);
        const targetNode = getSlotElement(slotName);
        targetNode.style.display = 'none'; // we will show all new slots, only when all will be settled
        this.#hiddenSlots.push(targetNode);
        observer.observe(targetNode, { childList: true, subtree: true, attributeFilter: ['style'] });
    };

    #renderFakeSlot = slotName => {
        const targetNode = getSlotElement(slotName);
        const clonedNode = targetNode.cloneNode(true);
        clonedNode.removeAttribute('id');
        clonedNode.removeAttribute('class');
        clonedNode.style.display = ''; // reset "display" in case if renderFakeSlot is run after addContentListener (slotWillBe.rendered and then slotWillBe.removed). Since we hide (set display: none) original DOM-node inside addContentListener.
        this.#fakeSlots.push(clonedNode);
        targetNode.parentNode.insertBefore(clonedNode, targetNode.nextSibling);
        targetNode.style.display = 'none'; // we hide old slot because fake already in the DOM.
        this.#hiddenSlots.push(targetNode);
    };

    #onPageReady = () => {
        this.#fakeSlots.forEach(node => node.remove());
        this.#fakeSlots.length = 0;
        this.#hiddenSlots.forEach(node => node.style.display = '');
        this.#hiddenSlots.length = 0;
        this.#removeGlobalSpinner();
        document.body.removeAttribute('name');
        scrollRestorer.restoreScroll(window.history.state ? window.history : {state: {scroll: {x: 0, y: 0}}});
        this.#isSlotsLoadedEventFired = false;
    };

    #runGlobalSpinner = () => {
        if (this.#spinnerConfig.enabled === false || this.#spinnerTimeout) {
            return;
        }

        this.#spinnerTimeout = setTimeout(() => {
            // if spinner appeared in 300ms, then show it at least 500ms, to avoid flashing it like a glitch
            this.#forceShowSpinner = setTimeout(() => {
                this.#removeTransactionBlocker(this.#forceShowSpinner);
                this.#forceShowSpinner = null;
            }, 500);
            this.#transactionBlockers.push(this.#forceShowSpinner);

            if (!this.#spinnerConfig.customHTML) {
                this.#globalSpinner = document.createElement('dialog');
                this.#globalSpinner.innerHTML = 'loading....';
                document.body.appendChild(this.#globalSpinner);
                this.#globalSpinner.showModal();
            } else {
                this.#globalSpinner = document.createElement('div');
                this.#globalSpinner.classList.add('ilcSpinnerWrapper');
                this.#globalSpinner.innerHTML = this.#spinnerConfig.customHTML;
                document.body.appendChild(this.#globalSpinner);

                // run script tags
                this.#globalSpinner.querySelectorAll('script').forEach(oldScript => {
                    const newScript = document.createElement('script');

                    newScript.innerHTML = oldScript.innerHTML;

                    oldScript.parentNode.insertBefore(newScript, oldScript);
                    oldScript.remove();
                });
            }
        }, 300);
    };

    #removeGlobalSpinner = () => {
        if (this.#globalSpinner) {
            this.#globalSpinner.remove();
            this.#globalSpinner = null;
        }

        clearTimeout(this.#spinnerTimeout);
        this.#spinnerTimeout = null;
    };

    #removeTransactionBlocker = (blocker) => {
        this.#transactionBlockers.splice(this.#transactionBlockers.indexOf(blocker), 1);

        const isOnlySpinnerBlocker = this.#transactionBlockers.length === 1 && this.#transactionBlockers[0] === this.#forceShowSpinner;

        if (isOnlySpinnerBlocker || !this.#transactionBlockers.length && !this.#isSlotsLoadedEventFired) {
            window.dispatchEvent(new CustomEvent('ilc:all-slots-loaded'));
            this.#isSlotsLoadedEventFired = true;
        }

        if (!this.#transactionBlockers.length) {
            this.#onPageReady();
        }
    };

    #addEventListeners = () => {
        scrollRestorer.start({ autoRestore: false, captureScrollDebounce: 150 });

        this.#windowEventHandlers['ilc:crash'] = this.#removeGlobalSpinner;
        this.#windowEventHandlers['single-spa:routing-event'] = this.#onRouteChange;

        for (const eventName in this.#windowEventHandlers) {
            window.addEventListener(eventName, this.#windowEventHandlers[eventName]);
        }
    };

    removeEventListeners = () => {
        scrollRestorer.end();

        for (const eventName in this.#windowEventHandlers) {
            window.removeEventListener(eventName, this.#windowEventHandlers[eventName]);
        }
    };

    #onRouteChange = () => {
        if (this.#transactionBlockers.length === 0) {
            this.#onPageReady();
            window.dispatchEvent(new CustomEvent('ilc:all-slots-loaded'));
        }
    };
}

let defaultInstance = null;
/**
 * @return {TransactionManager}
 */
export default function defaultFactory() {
    if (defaultInstance === null) {
        const ilcSettings = getIlcConfig().settings;
        defaultInstance = new TransactionManager(ilcSettings && ilcSettings.globalSpinner);
    }

    return defaultInstance;
}
