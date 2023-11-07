import { getSlotElement } from '../utils';
import TransitionBlocker from './TransitionBlocker';
import NamedTransactionBlocker from './NamedTransitionBlocker';
import singleSpaEvents from '../constants/singleSpaEvents';
import ilcEvents from '../constants/ilcEvents';
import TransitionBlockerList from './TransitionBlockerList';
import { CssTrackedApp } from '../CssTrackedApp';
import { GlobalSpinner } from './GlobalSpinner/GlobalSpinner';
import { ScrollController } from './ScrollController/ScrollController';
import { SlotRenderObserver } from './SlotRenderObserver/SlotRenderObserver';

export const slotWillBe = {
    rendered: 'rendered',
    removed: 'removed',
    rerendered: 'rerendered',
    default: null,
};

// This is a small workaround to ensure that Transition Manager and subscription will be created only when it is possible
// it is added for a quick fix
// but in future TransitionManager has to be refactored, so the unsafe operations are performed outside this class and be strongly controlled
let unsafeEventSubscriptionHappened = false;

export class TransitionManager {
    #logger;
    #spinnerController;

    // IE 11 backward compatibility
    #forceShowSpinnerBlockerId = window.Symbol ? window.Symbol('forceShowSpinner') : 'FORCE_SHOW_SPINNER';

    #fakeSlots = [];
    #hiddenSlots = [];
    #windowEventHandlers = {};

    /** @type TransitionBlockerList */
    #transitionBlockers = new TransitionBlockerList();
    #scrollController = new ScrollController();

    constructor(logger, spinnerConfig) {
        this.#logger = logger;
        this.#spinnerController = new GlobalSpinner(spinnerConfig);

        this.#addEventListeners();
    }
    // This method is required for switch localisation
    handleAsyncAction(promise) {
        if (!this.#spinnerController.isEnabled()) {
            return;
        }

        this.#runGlobalSpinner();
        this.#addTransitionBlocker(new TransitionBlocker(promise));
    }

    // This method is required for changing pages
    handlePageTransition = (slotName, willBe) => {
        if (!this.#spinnerController.isEnabled()) {
            return;
        }

        if (!slotName) {
            throw new Error('A slot name was not provided!');
        }

        try {
            getSlotElement(slotName);
        } catch (e) {
            // TODO: better error detection
            if (willBe !== slotWillBe.default) {
                this.#logger.warn(
                    `Failed to correctly handle page transition "${willBe}" for slot "${slotName}" due to it's absence in template. Ignoring it...`,
                );
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

    removeEventListeners = () => {
        for (const eventName in this.#windowEventHandlers) {
            window.removeEventListener(eventName, this.#windowEventHandlers[eventName]);
        }

        unsafeEventSubscriptionHappened = false;
    };

    #addContentListener = (slotName) => {
        if (this.#transitionBlockerExists(slotName)) {
            // @todo report incorrect behaviour
            return;
        }

        const observer = new SlotRenderObserver();

        const contentListenerBlocker = new NamedTransactionBlocker(slotName, (resolve) => {
            this.#runGlobalSpinner();
            this.#scrollController.store();

            const targetNode = getSlotElement(slotName);
            targetNode.style.display = 'none'; // we will show all new slots, only when all will be settled
            this.#hiddenSlots.push(targetNode);

            observer.observe(targetNode, {
                onSlotReady: function () {
                    resolve();
                },
            });
        });

        contentListenerBlocker.onDestroy(() => {
            observer.disconnect();
        });

        this.#addTransitionBlocker(contentListenerBlocker);
    };

    #renderFakeSlot = (slotName) => {
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
        this.#fakeSlots.forEach((node) => node.remove());
        CssTrackedApp.removeAllNodesPendingRemoval();
        this.#fakeSlots.length = 0;
        this.#hiddenSlots.forEach((node) => {
            node.style.display = '';
            node.hasAttribute('ilc-fake-slot-rendered') && node.removeAttribute('ilc-fake-slot-rendered');
        });
        this.#hiddenSlots.length = 0;

        this.#removeGlobalSpinner();
        this.#scrollController.restore();

        window.dispatchEvent(new CustomEvent(ilcEvents.PAGE_READY));
    };

    // if spinner appeared in showAfter ms, then show it at least minimumVisible time, to avoid flashing it like a glitch
    #getVisibilitySpinnerBlocker = (minimumVisibleTime) => {
        let timer;
        let forceResolve;

        const spinnerBlocker = new NamedTransactionBlocker(this.#forceShowSpinnerBlockerId, (resolve) => {
            timer = setTimeout(() => {
                resolve();
            }, minimumVisibleTime);

            forceResolve = resolve;
        }).onDestroy(() => {
            timer && clearTimeout(timer);
            forceResolve();
        });

        return spinnerBlocker;
    };

    #runGlobalSpinner = () => {
        if (!this.#spinnerController.isEnabled()) {
            return;
        }

        if (this.#spinnerController.isInProgress()) {
            // ToDo: We should not show spinner twice so this condition should report an error
            return;
        }

        this.#spinnerController.start({
            onBeforeStart: ({ minimumVisibleTime }) => {
                this.#addTransitionBlocker(this.#getVisibilitySpinnerBlocker(minimumVisibleTime));
            },
        });
    };

    #removeGlobalSpinner = () => {
        this.#spinnerController.stop();
    };

    #addTransitionBlocker = (transactionBlocker) => {
        transactionBlocker.finally(() => this.#removeTransitionBlocker(transactionBlocker.getId()));
        this.#transitionBlockers.add(transactionBlocker);
    };

    #transitionBlockerExists = (blockerId) => {
        return this.#transitionBlockers.findById(blockerId) !== undefined;
    };

    #removeTransitionBlocker = (blockerId) => {
        const blocker = this.#transitionBlockers.findById(blockerId);

        if (!blocker) {
            return;
        }

        blocker.destroy();
        this.#transitionBlockers.remove(blocker);

        if (this.#transitionBlockers.isEmpty()) {
            this.#onPageReady();
        }

        const isOnlySpinnerBlockerLeft =
            this.#transitionBlockers.size() === 1 &&
            this.#transitionBlockers.findById(this.#forceShowSpinnerBlockerId) !== undefined;

        const removingNotSpinnerBlockerAsLastOne =
            this.#transitionBlockers.size() === 0 && blockerId !== this.#forceShowSpinnerBlockerId;

        if (isOnlySpinnerBlockerLeft || removingNotSpinnerBlockerAsLastOne) {
            window.dispatchEvent(new CustomEvent(ilcEvents.ALL_SLOTS_LOADED));
        }
    };

    #addEventListeners = () => {
        this.#windowEventHandlers[ilcEvents.CRASH] = this.#removeGlobalSpinner;
        this.#windowEventHandlers[singleSpaEvents.ROUTING_EVENT] = this.#onRouteChange;

        if (unsafeEventSubscriptionHappened) {
            throw new Error(
                'There is an attempt to subscribe on SPA routing twice, which is unsafe and will spin additional events of ILC lifecycle. Most probably it is an internal ILC error.',
            );
        }

        for (const eventName in this.#windowEventHandlers) {
            window.addEventListener(eventName, this.#windowEventHandlers[eventName]);
        }

        unsafeEventSubscriptionHappened = true;
    };

    #onRouteChange = () => {
        this.#scrollController.onEveryRouteChange();
        if (!this.#transitionBlockers.isEmpty()) {
            return;
        }

        this.#onPageReady();
        if (!this.#transitionBlockers.isReady()) {
            this.#transitionBlockers.init();
            // ilcEvents.ALL_SLOTS_LOADED is dispatched only on first page load here
            window.dispatchEvent(new CustomEvent(ilcEvents.ALL_SLOTS_LOADED));
        }
    };
}
