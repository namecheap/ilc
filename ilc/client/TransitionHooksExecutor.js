import { TransitionHookError } from '../common/transition-hooks/errors';
import { ActionType } from '../common/transition-hooks/ActionType';

export default class TransitionHooksExecutor {
    #router;
    #transitionHooksPlugin;
    #errorHandler;
    #logger;

    constructor(router, pluginManager, errorHandler, logger = window.console) {
        this.#router = router;
        this.#transitionHooksPlugin = pluginManager.getTransitionHooksPlugin();
        this.#errorHandler = errorHandler;
        this.#logger = logger;
    }

    shouldNavigate(url) {
        const route = this.#router.match(url);
        // This code is executed before the router change, so current = previous
        const prevRoute = this.#router.getCurrentRoute();

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
                    route: {
                        meta: route.meta,
                        url: route.reqUrl,
                        hostname: window.location.host,
                        route: route.route,
                    },
                    prevRoute: {
                        meta: prevRoute.meta,
                        url: prevRoute.reqUrl,
                        hostname: window.location.host,
                        route: route.route,
                    },
                    navigate: this.#router.navigateToUrl,
                });

                if (action.type === ActionType.stopNavigation) {
                    this.#logger.info(
                        `ILC: Stopped navigation due to the Route Guard with index #${hooks.indexOf(hook)}`,
                    );
                    return false;
                }

                if (action.type === ActionType.redirect) {
                    // Need to add redirect callback to queued tasks
                    // because it should be executed after micro tasks that can be added after the end of this method
                    setTimeout(() => {
                        this.#logger.info(
                            `ILC: Redirect from "${route.reqUrl}" to "${
                                action.newLocation
                            }" due to the Transition Hook with index #${hooks.indexOf(hook)}`,
                        );
                        this.#router.navigateToUrl(action.newLocation);
                    });
                    return false;
                }
            } catch (error) {
                const hookIndex = hooks.indexOf(hook);

                this.#errorHandler(
                    new TransitionHookError({
                        message: `An error has occurred while executing "${hookIndex}" transition hook for the following URL: "${url}".`,
                        data: {
                            hookIndex,
                            url,
                        },
                        cause: error,
                    }),
                );
                return false;
            }
        }

        // If none of the hooks returned "redirect" or "stop-navigation" action
        return true;
    }
}
