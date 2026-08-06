import config from 'config';
import type { Ruleset, RulesetProvider } from './interfaces';
import { StaticConfigRulesetProvider } from './StaticConfigRulesetProvider';

/**
 * The source ILC ships with: the static JSON config layer. Constructed eagerly, exactly as it
 * was before a plugin could supply the ruleset, so a deployment without such a plugin reads
 * (and reports problems in) its configured ruleset at the same moment it always did.
 */
const staticRulesetProvider = new StaticConfigRulesetProvider();

/**
 * The slice of the plugin manager this module needs. Declared structurally, and with the
 * accessor optional, so ILC keeps compiling and behaving identically against an
 * `ilc-plugins-sdk` that predates the `experimentsRuleset` plugin type — there the accessor is
 * simply absent and the config layer stays in charge.
 */
interface ExperimentsRulesetPluginHost {
    getExperimentsRulesetPlugin?: () => RulesetProvider | undefined;
}

let pluginLookupDone = false;
let pluginProvider: RulesetProvider | undefined;

/**
 * Ask the plugin manager for a ruleset source, once, on first use.
 *
 * Lazily, because `./plugins/pluginManager` is a module-level singleton that discovers and loads
 * every installed plugin the first time it is required: requiring it while this module is being
 * imported would pull plugin loading ahead of ILC's own bootstrap order, and into every unit test
 * that touches the experiment layer. Which plugins are installed cannot change while ILC runs, so
 * the lookup is cached — the *ruleset* behind it is still read per call (see
 * {@link createRulesetProvider}), which is what lets a plugin refresh its copy in the background.
 */
function pluginRulesetProvider(): RulesetProvider | undefined {
    if (!pluginLookupDone) {
        pluginLookupDone = true;

        try {
            const pluginManager: ExperimentsRulesetPluginHost = require('../plugins/pluginManager');
            pluginProvider = pluginManager.getExperimentsRulesetPlugin?.();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('[experiments] failed to read the ruleset plugin; using the config layer', error);
        }
    }

    return pluginProvider;
}

/**
 * Chain a plugin-supplied ruleset source in front of a fallback one.
 *
 * The plugin wins only while it actually supplies experiments. An empty result means "nothing
 * supplied" — which is precisely what the SDK's default returns when no plugin of that type is
 * installed — so the fallback stays in charge and installing the plugin type changes nothing on
 * its own. The same rule protects a live deployment: a plugin that has not filled its copy yet,
 * or lost its source, hands back an empty ruleset rather than a populated one, and turning every
 * experiment off at once is never the safer reading of that.
 *
 * Both failure modes are contained here rather than left to the caller, because `getRuleset()` is
 * on the request path: whatever a plugin does, a page still renders with the fallback ruleset.
 *
 * Exported so the chain can be tested without installing a plugin.
 */
export function createRulesetProvider(
    resolvePlugin: () => RulesetProvider | undefined,
    fallback: RulesetProvider,
): RulesetProvider {
    let failureReported = false;

    return {
        getRuleset(): Ruleset {
            const plugin = resolvePlugin();

            if (plugin !== undefined) {
                try {
                    const supplied = plugin.getRuleset();

                    if (isNonEmptyRuleset(supplied)) {
                        return supplied;
                    }
                } catch (error) {
                    if (!failureReported) {
                        // Once, not once per request — this runs while a request is being resolved.
                        failureReported = true;
                        // eslint-disable-next-line no-console
                        console.warn('[experiments] the ruleset plugin threw; using the config layer', error);
                    }
                }
            }

            return fallback.getRuleset();
        },
    };
}

/**
 * A ruleset with something in it. Guards the shape as well as the size: a plugin is ordinary
 * deployment code, so it may hand back `undefined` or a non-object, and neither is a ruleset.
 * A well-shaped ruleset carrying malformed *experiments* deliberately passes through — the
 * assignment layer already tolerates those, and `validateRuleset` reports them.
 */
function isNonEmptyRuleset(value: Ruleset | undefined): value is Ruleset {
    return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
}

/**
 * The active ruleset source: a plugin-supplied one when a deployment installs an
 * `experimentsRuleset` plugin, otherwise the static JSON config layer
 * ({@link StaticConfigRulesetProvider}). The assignment layer reads the ruleset through this
 * provider, never from config directly, and reads it per request — so a plugin that syncs its
 * copy in the background is picked up without a restart.
 */
export const defaultRulesetProvider: RulesetProvider = createRulesetProvider(
    pluginRulesetProvider,
    staticRulesetProvider,
);

/**
 * Convenience snapshot of the ruleset the config layer declares.
 *
 * Deliberately not taken from {@link defaultRulesetProvider}: a plugin-supplied source can change
 * its ruleset while ILC runs, and a value captured at import time would pin the first snapshot for
 * the lifetime of the process. Anything that has to see what is actually being served must call
 * `defaultRulesetProvider.getRuleset()` per read, as `applyExperiments` does.
 */
export const ruleset: Ruleset = staticRulesetProvider.getRuleset();

/**
 * Global kill-switch. Experiments run unless `experiments.enabled` is explicitly
 * `false` (boolean or the string `"false"`, so an env-var override works). Lets ops
 * disable all experiments at once without a deploy. This is intentionally separate from
 * the ruleset source above: it stays an ops-level config toggle even once experiment
 * definitions move to the Experiment Service.
 */
export function isExperimentsEnabledValue(value: unknown): boolean {
    return value !== false && value !== 'false';
}

export function experimentsEnabled(): boolean {
    return isExperimentsEnabledValue(config.has('experiments.enabled') ? config.get('experiments.enabled') : undefined);
}
