import actionTypes from '../common/guard/actionTypes';

export default class GuardManager {
    #router;
    #transitionHooksPlugin;
    #errorHandler;

    constructor(router, pluginManager, errorHandler) {
        this.#router = router;
        this.#transitionHooksPlugin = pluginManager.getTransitionHooksPlugin();
        this.#errorHandler = errorHandler;
    }

    hasAccessTo(url) {
        if (this.#transitionHooksPlugin === null) {
            return true;
        }

        const route = this.#router.match(url);

        if (route.specialRole !== null) {
            return true;
        }

        for (const hook of this.#transitionHooksPlugin.getTransitionHooks()) {
            let action;

            try {
                action = hook({
                    route: {...route, url},
                    navigate: this.#router.navigateToUrl,
                });
            } catch (error) {
                this.#errorHandler(error);
                return false;
            }

            if (action.type === actionTypes.stopNavigation) {
                return false;
            }

            if (action.type === actionTypes.redirect) {
                // Need to add redirect callback to queued tasks
                // because it should be executed after micro tasks that can be added after the end of this method
                setTimeout(() => this.#router.navigateToUrl(action.newLocation));
                return false;
            }
        }

        // If none of the hooks returned "redirect" or "stop-navigation" action
        return true;
    }
};
