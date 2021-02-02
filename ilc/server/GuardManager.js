const actionTypes = require('../common/guard/actionTypes');

class GuardManager {
    #transitionHooksPlugin;

    constructor(pluginManager) {
        this.#transitionHooksPlugin = pluginManager.getTransitionHooksPlugin();
    }

    async hasAccessTo(req, res) {
        if (this.#transitionHooksPlugin === null) {
            return true;
        }

        const route = req.router.getRoute();
        const hooks = this.#transitionHooksPlugin.getTransitionHooks();

        if (hooks.length === 0) {
            return true;
        }

        const actions = await Promise.all(hooks.map((hook) => hook({
            route,
            req,
        })));

        for (const action of actions) {
            if (action.type === actionTypes.redirect && action.newLocation) {
                res.redirect(action.newLocation);
                return false;
            }
        }

        return true;
    }
}

module.exports = GuardManager;
