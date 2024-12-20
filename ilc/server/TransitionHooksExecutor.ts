import { PluginManager, TransitionHooksPlugin } from 'ilc-plugins-sdk';
import { TransitionHookError } from '../common/guard/errors';

type TransitionResult = {
    location: string;
    code: number;
};

export class TransitionHooksExecutor {
    private readonly transitionHooksPlugin: TransitionHooksPlugin;

    constructor(pluginManager: PluginManager) {
        this.transitionHooksPlugin = pluginManager.getTransitionHooksPlugin();
    }

    async redirectTo(req: any): Promise<TransitionResult | null> {
        const route = req.raw.router.getRoute();

        if (route.specialRole !== null) {
            return null;
        }

        const hooks = this.transitionHooksPlugin.getTransitionHooks();

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

                if (action.type === 'redirect' && action.newLocation) {
                    const code = action.code ?? 302;
                    if (code < 300 || code > 308) {
                        throw new TransitionHookError({ message: 'Invlid redirect code' });
                    }
                    return {
                        location: action.newLocation,
                        code,
                    };
                }
            } catch (error) {
                const hookIndex = hooks.indexOf(hook);
                throw new TransitionHookError({
                    message: `An error has occurred while executing "${hookIndex}" transition hook.`,
                    data: {
                        hookIndex,
                    },
                    cause: error as Error,
                });
            }
        }

        return null;
    }
}
