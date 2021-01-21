import actionTypes from '../common/guard/actionTypes';

export default class GuardManager {
    #router;
    #transitionHooksPlugin;

    constructor(router, pluginManager) {
        this.#router = router;
        this.#transitionHooksPlugin = pluginManager.getTransitionHooksPlugin();
    }

    hasAccessTo(url) {
        let hasAccess = true;

        if (this.#transitionHooksPlugin === null) {
            return hasAccess;
        }

        const route = this.#router.match(url);

        if (route.specialRole === null) {
            for (const hook of this.#transitionHooksPlugin.getTransitionHooks()) {
                const action = hook({
                    route: {...route, url},
                    navigate: this.#router.navigateToUrl,
                });

                if (hasAccess && action.type === actionTypes.stopNavigation) {
                    hasAccess = false;
                }
            }
        }

        return hasAccess;
    }
};
