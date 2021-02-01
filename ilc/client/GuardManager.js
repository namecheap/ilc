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
        let hasAccess = true;

        if (this.#transitionHooksPlugin === null) {
            return hasAccess;
        }

        const route = this.#router.match(url);

        if (route.specialRole !== null) {
            return hasAccess;
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
                hasAccess = false;
                break;
            }

            if (action.type === actionTypes.stopNavigation) {
                hasAccess = false;
                break;
            }

            if (action.type === actionTypes.redirect) {
                // Need to add redirect callback to queued tasks
                // because it should be executed after micro tasks that can be added after the end of this method
                setTimeout(() => this.#router.navigateToUrl(action.newLocation));
                hasAccess = false;
                break;
            }
        }

        return hasAccess;
    }
};
