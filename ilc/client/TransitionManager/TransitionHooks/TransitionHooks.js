import singleSpaEvents from '../../constants/singleSpaEvents';
import ilcEvents from '../../constants/ilcEvents';

export class TransitionHooks {
    #targetHref;
    #subscribed = false;
    #hookList = [];
    #logger;
    #beforeRoutingHandler;
    #allSlotsLoadedHandler;

    constructor(logger) {
        this.#logger = logger;
    }

    addHook(hookInstance) {
        this.#hookList.push(hookInstance);
    }

    subscribe() {
        if (this.#subscribed) {
            this.#logger.warn('ILC: TransitionHooks. Unexpected subscription happened');
            return;
        }

        // ToDo: avoid using singleSpaEvents.BEFORE_ROUTING_EVENT ans switch to ilc.BEFORE_ROUTING
        // Need to make it with increasing code coverage
        this.#beforeRoutingHandler = () => {
            // Check is needed as this event may be triggered 2 times
            // due to "app re-mount due to changed props" functionality
            if (this.#targetHref === window.location.href) {
                return;
            }

            try {
                this.#hookList.forEach((hook) => {
                    hook.beforeHandler();
                });
            } catch (error) {
                this.#logger.error('ILC: transition hooks before handler error');
            }

            this.#targetHref = window.location.href;
        };

        this.#allSlotsLoadedHandler = () => {
            try {
                this.#hookList.forEach((hook) => {
                    hook.afterHandler();
                });
            } catch (error) {
                this.#logger.error('ILC: transition hooks after handler error');
            }
        };

        window.addEventListener(singleSpaEvents.BEFORE_ROUTING_EVENT, this.#beforeRoutingHandler);
        window.addEventListener(ilcEvents.ALL_SLOTS_LOADED, this.#allSlotsLoadedHandler);

        this.#subscribed = true;
    }

    unsubscribe() {
        if (!this.#subscribed) {
            return;
        }

        if (this.#beforeRoutingHandler) {
            window.removeEventListener(singleSpaEvents.BEFORE_ROUTING_EVENT, this.#beforeRoutingHandler);
        }

        if (this.#allSlotsLoadedHandler) {
            window.removeEventListener(ilcEvents.ALL_SLOTS_LOADED, this.#allSlotsLoadedHandler);
        }

        this.#subscribed = false;
    }
}
