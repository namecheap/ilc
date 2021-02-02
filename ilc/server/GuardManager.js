const actionTypes = require('../common/guard/actionTypes');

class GuardManager {
    #transitionHooksPlugin;

    constructor(pluginManager) {
        this.#transitionHooksPlugin = pluginManager.getTransitionHooksPlugin();
    }

    async redirectTo(req) {
        if (this.#transitionHooksPlugin === null) {
            return null;
        }

        const route = req.router.getRoute();
        const hooks = this.#transitionHooksPlugin.getTransitionHooks();

        if (hooks.length === 0) {
            return null;
        }

        const actions = await Promise.all(hooks.map((hook) => hook({
            route,
            req,
        })));

        for (const action of actions) {
            if (action.type === actionTypes.redirect && action.newLocation) {
                return action.newLocation;
            }
        }

        return null;
    }
}

module.exports = GuardManager;
