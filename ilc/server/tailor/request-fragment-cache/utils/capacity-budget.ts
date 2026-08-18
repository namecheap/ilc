export const MAX_BODY_BYTES = 1024 * 1024;
export const MAX_CONCURRENT_CAPTURES = 32;
export const MAX_TOTAL_BODY_BYTES = 64 * 1024 * 1024;
export const MAX_ENTRIES = 500;

/** Capacity knobs of the fragment cache. Configuration, not behaviour — no seam is implied. */
export interface CapacityBudget {
    maxBodyBytes: number;
    maxConcurrentCaptures: number;
    maxTotalBodyBytes: number;
    maxEntries: number;
}

export const DEFAULT_CAPACITY_BUDGET: CapacityBudget = {
    maxBodyBytes: MAX_BODY_BYTES,
    maxConcurrentCaptures: MAX_CONCURRENT_CAPTURES,
    maxTotalBodyBytes: MAX_TOTAL_BODY_BYTES,
    maxEntries: MAX_ENTRIES,
};

/**
 * An in-flight capture can buffer up to maxBodyBytes before the store's byte budget sees it, so
 * concurrent misses bypass the LRU limit — resolving here bounds that overshoot and fails at
 * composition time instead of silently exceeding the memory ceiling.
 */
export function resolveCapacityBudget(overrides: Partial<CapacityBudget> = {}): CapacityBudget {
    const budget = { ...DEFAULT_CAPACITY_BUDGET, ...overrides };

    for (const [name, value] of Object.entries(budget)) {
        if (!Number.isInteger(value) || value <= 0) {
            throw new Error(`Fragment cache capacity budget invalid: ${name} must be a positive integer, got ${value}`);
        }
    }

    if (budget.maxConcurrentCaptures * budget.maxBodyBytes > budget.maxTotalBodyBytes) {
        throw new Error(
            `Fragment cache capacity budget violated: maxConcurrentCaptures (${budget.maxConcurrentCaptures}) × ` +
                `maxBodyBytes (${budget.maxBodyBytes}) exceeds maxTotalBodyBytes (${budget.maxTotalBodyBytes})`,
        );
    }

    return budget;
}
