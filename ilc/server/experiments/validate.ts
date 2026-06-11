import type { Experiment, ExperimentVariant, Ruleset } from './interfaces';

const TOTAL_WEIGHT = 100;
const VALID_STATUSES = ['active', 'paused'];

// The experiment id becomes part of the cookie name `x-ab-<id>`. Restrict it to
// characters that are valid in a cookie name (RFC 6265 token), so a typo such as a
// space or `;` can't make `Set-Cookie` throw at request time and silently disable
// the experiment for every visitor.
const COOKIE_SAFE_ID = /^[A-Za-z0-9._-]+$/;

function checkId(experimentId: string): string[] {
    if (COOKIE_SAFE_ID.test(experimentId)) {
        return [];
    }
    return [
        `"${experimentId}": id may only contain letters, digits, dot, underscore or hyphen (it is used in the x-ab-<id> cookie name)`,
    ];
}

function checkStatus(experimentId: string, experiment: Experiment): string[] {
    if (VALID_STATUSES.includes(experiment.status)) {
        return [];
    }
    return [
        `"${experimentId}": status "${experiment.status}" is not one of ${VALID_STATUSES.join(', ')} — the experiment will never run`,
    ];
}

function checkVariant(experimentId: string, variant: ExperimentVariant): string[] {
    if (typeof variant.weight !== 'number' || !Number.isFinite(variant.weight)) {
        return [`"${experimentId}": variant "${variant.name}" has a non-numeric weight`];
    }
    if (variant.weight < 0) {
        return [`"${experimentId}": variant "${variant.name}" has a negative weight`];
    }
    if (variant.weight === 0) {
        // A zero-weight variant owns an empty bucket slice and is never assigned;
        // flag it because authors treat the first variant as the baseline fallback.
        return [`"${experimentId}": variant "${variant.name}" has weight 0 and will never be assigned`];
    }
    return [];
}

function checkVariants(experimentId: string, variants: readonly ExperimentVariant[]): string[] {
    const problems: string[] = [];
    const names = new Set<string>();
    let total = 0;

    for (const variant of variants) {
        if (names.has(variant.name)) {
            problems.push(`"${experimentId}": duplicate variant name "${variant.name}"`);
        }
        names.add(variant.name);

        problems.push(...checkVariant(experimentId, variant));
        total += Number.isFinite(variant.weight) ? variant.weight : 0;
    }

    if (total !== TOTAL_WEIGHT) {
        problems.push(`"${experimentId}": variant weights sum to ${total}, expected ${TOTAL_WEIGHT}`);
    }
    return problems;
}

/**
 * Check a ruleset for authoring mistakes that would otherwise fail *silently* at
 * runtime — a cookie-unsafe id, a typo'd `status` (which would make the experiment
 * never run with no error), non-numeric or negative weights, weights that don't sum
 * to 100, a zero-weight (unreachable) variant, or duplicate variant names. Returns a
 * list of human-readable problems (empty when valid).
 *
 * This is advisory and defensive: it never throws — even on a structurally broken
 * ruleset (e.g. a missing `variants` array from an untyped source) — so a bad
 * ruleset can be reported in CI or at load without ever blocking ILC bootstrap.
 */
export function validateRuleset(ruleset: Ruleset): string[] {
    const problems: string[] = [];

    for (const [experimentId, experiment] of Object.entries(ruleset)) {
        problems.push(...checkId(experimentId));

        if (!experiment || typeof experiment !== 'object') {
            problems.push(`"${experimentId}": is not an experiment object`);
            continue;
        }

        problems.push(...checkStatus(experimentId, experiment));

        const { variants } = experiment;
        if (!Array.isArray(variants) || variants.length === 0) {
            problems.push(`"${experimentId}": has no variants`);
            continue;
        }

        problems.push(...checkVariants(experimentId, variants));
    }

    return problems;
}
