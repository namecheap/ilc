import config from 'config';
import type { Ruleset, RulesetProvider } from './interfaces';
import { StaticConfigRulesetProvider } from './StaticConfigRulesetProvider';

/**
 * The active ruleset source. Current default: the static-JSON-backed provider
 * ({@link StaticConfigRulesetProvider}); see that file for how the source can later move
 * to an Experiment-Service-backed provider. The assignment layer reads the ruleset
 * through this provider, never from config directly.
 */
export const defaultRulesetProvider: RulesetProvider = new StaticConfigRulesetProvider();

/** Convenience snapshot of the current ruleset from the default provider. */
export const ruleset: Ruleset = defaultRulesetProvider.getRuleset();

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
