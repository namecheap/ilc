import errors from '../common/guard/errors';
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

        const hooks = this.#transitionHooksPlugin.getTransitionHooks();

        if (hooks.length === 0) {
            return true;
        }

        for (const hook of hooks) {
            try {
                const action = hook({
                    route: {...route, url},
                    navigate: this.#router.navigateToUrl,
                });

                if (action.type === actionTypes.stopNavigation) {
                    return false;
                }

                if (action.type === actionTypes.redirect) {
                    // Need to add redirect callback to queued tasks
                    // because it should be executed after micro tasks that can be added after the end of this method
                    setTimeout(() => this.#router.navigateToUrl(action.newLocation));
                    return false;
                }
            } catch (error) {
                const hookIndex = hooks.indexOf(hook);
                this.#errorHandler(new errors.GuardTransitionHookError({
                    message: `An error has occurred while executing "${hookIndex}" transition hook for the following URL: "${url}".`,
                    data: {
                        hookIndex,
                        url,
                    },
                    cause: error,
                }));
                return false;
            }
        }

        // If none of the hooks returned "redirect" or "stop-navigation" action
        return true;
    }
};
