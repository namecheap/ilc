import singleSpaEvents from '../../constants/singleSpaEvents';
import ilcEvents from '../../constants/ilcEvents';

export class TransitionHooks {

    #targetHref;

    addHook(hookInstance) {
        // ToDo: avoid using singleSpaEvents.BEFORE_ROUTING_EVENT ans switch to ilc.BEFORE_ROUTING
        // Need to make it with increasing code coverage
        window.addEventListener(singleSpaEvents.BEFORE_ROUTING_EVENT, () => {

            // Check is needed as this event may be triggered 2 times
            // due to "app re-mount due to changed props" functionality
            if (this.#targetHref === window.location.href) {
                return;
            }
            hookInstance.beforeHandler();

            this.#targetHref = window.location.href;
        });
        window.addEventListener(ilcEvents.ALL_SLOTS_LOADED, hookInstance.afterHandler.bind(hookInstance));
    }
}
