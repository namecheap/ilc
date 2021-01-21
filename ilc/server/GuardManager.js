const actionTypes = require('../common/guard/actionTypes');

class GuardManager {
    #transitionHooksPlugin;

    constructor(pluginManager) {
        this.#transitionHooksPlugin = pluginManager.getTransitionHooksPlugin();
    }

    async hasAccessTo(req, res) {
        let hasAccess = true;

        if (this.#transitionHooksPlugin === null) {
            return hasAccess;
        }

        const route = req.raw.router.getRoute();
        const hooks = this.#transitionHooksPlugin.getTransitionHooks();

        if (hooks.length === 0) {
            return hasAccess;
        }

        const actions = await Promise.all(hooks.map((hook) => hook({
            route,
            req: req.raw,
        })));

        for (const action of actions) {
            if (action.type === actionTypes.redirect && action.newLocation) {
                res.redirect(action.newLocation);
                return (hasAccess = false);
            }
        }

        return hasAccess;
    }
}

module.exports = GuardManager;
