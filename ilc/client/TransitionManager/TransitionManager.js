import { getSlotElement } from '../utils';
import { getIlcConfigRoot } from '../configuration/getIlcConfigRoot';
import TransitionBlocker from './TransitionBlocker';
import NamedTransactionBlocker from './NamedTransitionBlocker';
import singleSpaEvents from '../constants/singleSpaEvents';
import ilcEvents from '../constants/ilcEvents';
import TransitionBlockerList from './TransitionBlockerList';
import { CssTrackedApp } from '../CssTrackedApp';

export const slotWillBe = {
    rendered: 'rendered',
    removed: 'removed',
    rerendered: 'rerendered',
    default: null,
};

export class TransitionManager {
    #logger;
    #spinnerConfig;
    #globalSpinner;
    #spinnerTimeout;

    // IE 11 backward compatibility
    #forceShowSpinnerBlockerId = window.Symbol ? window.Symbol('forceShowSpinner') : 'FORCE_SHOW_SPINNER';

    #fakeSlots = [];
    #hiddenSlots = [];
    #windowEventHandlers = {};

    /** @type TransitionBlockerList */
    #transitionBlockers = new TransitionBlockerList();

    constructor(logger, spinnerConfig) {
        const defaultSpinnerConfig = {
            enabled: true,
            customHTML: '',
            showAfter: 300,
            minimumVisible: 500,
        };

        this.#logger = logger;
        this.#spinnerConfig = Object.assign({}, defaultSpinnerConfig, spinnerConfig);

        this.#addEventListeners();
    }

    handleAsyncAction(promise) {
        if (this.#spinnerConfig.enabled === false) {
            return;
        }

        this.#runGlobalSpinner();
        this.#addTransitionBlocker(new TransitionBlocker(promise));
    }

    handlePageTransition = (slotName, willBe) => {
        if (this.#spinnerConfig.enabled === false) {
            return;
        }

        if (!slotName) {
            throw new Error('A slot name was not provided!');
        }

        try {
            getSlotElement(slotName);
        } catch (e) { // TODO: better error detection
            if (willBe !== slotWillBe.default) {
                this.#logger.warn(`Failed to correctly handle page transition "${willBe}" for slot "${slotName}" due to it's absence in template. Ignoring it...`);
            }

            return;
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
    };

    reportSlotRenderingError(slotName) {
        this.#removeTransitionBlocker(slotName);
    }

    #addContentListener = slotName => {
        if (this.#transitionBlockerExists(slotName)) {
            return;
        }

        let observer;

        const contentListenerBlocker = new NamedTransactionBlocker(slotName, (resolve) => {
            this.#runGlobalSpinner();

            if (window.location.hash) {
                document.body.setAttribute('name', window.location.hash.slice(1));
            }

            const status = {
                hasAddedNodes: false,
                hasTextOrOpticNodes: false,
                isAnyChildVisible: false,
            };

            observer = new MutationObserver((mutationsList) => {
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

                resolve();
            });

            const targetNode = getSlotElement(slotName);
            targetNode.style.display = 'none'; // we will show all new slots, only when all will be settled
            this.#hiddenSlots.push(targetNode);
            observer.observe(targetNode, { childList: true, subtree: true, attributeFilter: ['style'] });
        })
        .onDestroy(() => {
            if (observer) {
                observer.disconnect();
            }
        });

        this.#addTransitionBlocker(contentListenerBlocker);
    };

    #renderFakeSlot = slotName => {
        const targetNode = getSlotElement(slotName);
        if (targetNode.hasAttribute('ilc-fake-slot-rendered')) {
            return; // Looks like it was already rendered
        }
        const clonedNode = targetNode.cloneNode(true);

        clonedNode.removeAttribute('id');
        clonedNode.removeAttribute('class');
        clonedNode.style.display = ''; // reset "display" in case if renderFakeSlot is run after addContentListener (slotWillBe.rendered and then slotWillBe.removed). Since we hide (set display: none) original DOM-node inside addContentListener.

        this.#fakeSlots.push(clonedNode);

        targetNode.parentNode.insertBefore(clonedNode, targetNode.nextSibling);
        targetNode.style.display = 'none'; // we hide old slot because fake already in the DOM.
        targetNode.setAttribute('ilc-fake-slot-rendered', '1');

        this.#hiddenSlots.push(targetNode);
    };

    #onPageReady = () => {
        this.#fakeSlots.forEach(node => node.remove());
        CssTrackedApp.removeAllNodesPendingRemoval();
        this.#fakeSlots.length = 0;
        this.#hiddenSlots.forEach(node => {
            node.style.display = '';
            node.hasAttribute('ilc-fake-slot-rendered') && node.removeAttribute('ilc-fake-slot-rendered')
        });
        this.#hiddenSlots.length = 0;

        this.#removeGlobalSpinner();
        document.body.removeAttribute('name');

        let scrollToElement;

        if (window.location.hash) {
            scrollToElement = document.querySelector(window.location.hash);
        }

        if (scrollToElement) {
            scrollToElement.scrollIntoView();
        } else {
            window.scroll(0, 0);
        }

        window.dispatchEvent(new CustomEvent(ilcEvents.PAGE_READY));
    };

    // if spinner appeared in showAfter ms, then show it at least minimumVisible time, to avoid flashing it like a glitch
    #getVisbilitySpinnerBlocker = () => {
        let timer;
        let forceResolve;

        const spinnerBlocker = new NamedTransactionBlocker(this.#forceShowSpinnerBlockerId, (resolve) => {
            timer = setTimeout(() => {
                resolve();
            }, this.#spinnerConfig.minimumVisible);

            forceResolve = resolve;
        }).onDestroy(() => {
            timer && clearTimeout(timer);
            forceResolve();
        });

        return spinnerBlocker;
    }

    #runGlobalSpinner = () => {
        if (this.#spinnerConfig.enabled === false || this.#spinnerTimeout) {
            return;
        }

        this.#spinnerTimeout = setTimeout(() => {
            this.#addTransitionBlocker(this.#getVisbilitySpinnerBlocker());

            const spinnerClass = 'ilcSpinnerWrapper';

            if (!this.#spinnerConfig.customHTML) {
                this.#globalSpinner = document.createElement('dialog');
                this.#globalSpinner.setAttribute('class', spinnerClass);
                this.#globalSpinner.innerHTML = 'loading....';
                document.body.appendChild(this.#globalSpinner);
                this.#globalSpinner.showModal();
            } else {
                this.#globalSpinner = document.createElement('div');
                this.#globalSpinner.classList.add(spinnerClass);
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
        }, this.#spinnerConfig.showAfter);
    };

    #removeGlobalSpinner = () => {
        if (this.#globalSpinner) {
            this.#globalSpinner.remove();
            this.#globalSpinner = null;
        }

        clearTimeout(this.#spinnerTimeout);
        this.#spinnerTimeout = null;
    };

    #addTransitionBlocker = (transactionBlocker) => {
        transactionBlocker.finally(() => this.#removeTransitionBlocker(transactionBlocker.getId()));
        this.#transitionBlockers.add(transactionBlocker);
    }

    #transitionBlockerExists = (blockerId) => {
        return this.#transitionBlockers.findById(blockerId) !== undefined;
    }

    #removeTransitionBlocker = (blockerId) => {
        const blocker = this.#transitionBlockers.findById(blockerId);

        if (!blocker) {
            return;
        }

        blocker.destroy();
        this.#transitionBlockers.remove(blocker);

        const isOnlySpinnerBlockerLeft = this.#transitionBlockers.size() === 1
            && this.#transitionBlockers.findById(this.#forceShowSpinnerBlockerId) !== undefined;

        const removingNotSpinnerBlockerAsLastOne = this.#transitionBlockers.size() === 0
            && blockerId !== this.#forceShowSpinnerBlockerId;

        if (this.#transitionBlockers.size() === 0) {
            this.#onPageReady();
        }

        if (isOnlySpinnerBlockerLeft || removingNotSpinnerBlockerAsLastOne) {
            window.dispatchEvent(new CustomEvent(ilcEvents.ALL_SLOTS_LOADED));
        }
    };

    #addEventListeners = () => {
        this.#windowEventHandlers[ilcEvents.CRASH] = this.#removeGlobalSpinner;
        this.#windowEventHandlers[singleSpaEvents.ROUTING_EVENT] = this.#onRouteChange;

        for (const eventName in this.#windowEventHandlers) {
            window.addEventListener(eventName, this.#windowEventHandlers[eventName]);
        }
    };

    removeEventListeners = () => {
        for (const eventName in this.#windowEventHandlers) {
            window.removeEventListener(eventName, this.#windowEventHandlers[eventName]);
        }
    };

    #onRouteChange = () => {
        if (this.#transitionBlockers.size() === 0) {
            this.#onPageReady();
            window.dispatchEvent(new CustomEvent(ilcEvents.ALL_SLOTS_LOADED));
        }
    };
}

let defaultTransitionManagerInstance = null;
/**
 * @return {TransitionManager}
 */
export default function defaultFactory() {
    if (defaultTransitionManagerInstance === null) {
        const ilcConfigRoot = getIlcConfigRoot();
        const ilcConfigSettings = ilcConfigRoot.getSettings();
        defaultTransitionManagerInstance = new TransitionManager(window.console, ilcConfigSettings && ilcConfigSettings.globalSpinner);
    }

    return defaultTransitionManagerInstance;
}
