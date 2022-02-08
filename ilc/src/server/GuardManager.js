const errors = require('../common/guard/errors');
const actionTypes = require('../common/guard/actionTypes');

class GuardManager {
    #transitionHooksPlugin;

    constructor(pluginManager) {
        this.#transitionHooksPlugin = pluginManager.getTransitionHooksPlugin();
    }

    /**
     * @param {FastifyRequest} req
     * @return {Promise<null|*>}
     */
    async redirectTo(req) {
        const route = req.raw.router.getRoute();

        if (route.specialRole !== null) {
            return null;
        }

        const hooks = this.#transitionHooksPlugin.getTransitionHooks();

        if (hooks.length === 0) {
            return null;
        }

        for (const hook of hooks) {
            try {
                const action = await hook({
                    route: {
                        meta: route.meta,
                        url: route.reqUrl,
                        hostname: req.hostname,
                    },
                    log: req.log,
                    req: req.raw,
                });

                if (action.type === actionTypes.redirect && action.newLocation) {
                    return action.newLocation;
                }
            } catch (error) {
                const hookIndex = hooks.indexOf(hook);
                throw new errors.GuardTransitionHookError({
                    message: `An error has occurred while executing "${hookIndex}" transition hook.`,
                    data: {
                        hookIndex,
                    },
                    cause: error,
                });
            }
        }

        return null;
    }
}

module.exports = GuardManager;
