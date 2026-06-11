import config from 'config';
import type { Ruleset, RulesetProvider } from './interfaces';
import { validateRuleset } from './validate';

/**
 * Current implementation of the experiment ruleset source: reads the ruleset from the
 * static JSON config layer — node-config `experiments.ruleset` (empty in the OSS baseline;
 * populated in a local/registry config layer, or injected in tests).
 *
 * This is the single place that knows where the ruleset comes from. The assignment layer
 * (assign / bucket / consent / cookies / propagation) only ever receives a resolved
 * `Ruleset` and never reads configuration, so the source can evolve on its own. See
 * `docs/ab-testing.md` for a later direction where a remote experiment-management service
 * — a management UI plus SSE/polling delivery — becomes the source of truth, letting
 * stakeholders manage experiments without an ILC deployment. That would arrive as another
 * {@link RulesetProvider} implementation
 * swapped in at `./ruleset`, with no change to the assignment layer — which is the point
 * of keeping the source behind this seam.
 *
 * The read is defensive: a malformed ruleset degrades to "no experiments" rather than
 * crashing ILC bootstrap, and validation problems are surfaced. It runs at construction
 * time — before the app's structured (pino) logger exists — so problems go to stdout.
 */
export class StaticConfigRulesetProvider implements RulesetProvider {
    private readonly ruleset: Ruleset;

    constructor() {
        this.ruleset = StaticConfigRulesetProvider.read();
    }

    public getRuleset(): Ruleset {
        return this.ruleset;
    }

    private static read(): Ruleset {
        if (!config.has('experiments.ruleset')) {
            return {};
        }

        try {
            const raw = config.get<Ruleset>('experiments.ruleset');
            const problems = validateRuleset(raw);
            if (problems.length > 0) {
                // eslint-disable-next-line no-console
                console.warn(`[experiments] ruleset has issues:\n  ${problems.join('\n  ')}`);
            }
            return raw;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('[experiments] failed to load ruleset; running with no experiments', error);
            return {};
        }
    }
}
