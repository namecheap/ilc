import { backOff } from 'exponential-backoff';

// Defaults
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_INITIAL_DELAY_MS = 100;
const DEFAULT_MAX_DELAY_MS = 4000;
const DEFAULT_TIME_MULTIPLE = 2;

// Hard caps
const HARD_CAP_MAX_ATTEMPTS = 5;
const HARD_CAP_MAX_DELAY_MS = 8000;

export type ExponentialRetryOptions = {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    timeMultiple?: number;
};

/**
 * Execute a promise-returning function with exponential backoff.
 * Caps attempts and max delay to prevent runaway retries.
 */
export async function exponentialRetry<T>(
    requestFn: () => Promise<T>,
    options: ExponentialRetryOptions = {},
): Promise<T> {
    const {
        maxAttempts = DEFAULT_MAX_ATTEMPTS,
        initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
        maxDelayMs = DEFAULT_MAX_DELAY_MS,
        timeMultiple = DEFAULT_TIME_MULTIPLE,
    } = options;

    const numOfAttempts = Math.min(Math.max(1, maxAttempts), HARD_CAP_MAX_ATTEMPTS);
    const startingDelay = Math.max(0, initialDelayMs);
    const maxDelay = Math.min(maxDelayMs, HARD_CAP_MAX_DELAY_MS);

    return backOff(requestFn, {
        numOfAttempts,
        startingDelay,
        maxDelay,
        timeMultiple,
        jitter: 'none' as const,
    });
}
