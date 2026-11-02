/**
 * Parses auth.sessionMaxAgeSeconds. Environment variables arrive as strings, so the value is coerced.
 */
export function parseSessionMaxAgeSeconds(value: unknown): number {
    const seconds =
        typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
    if (!Number.isFinite(seconds) || seconds <= 0) {
        throw new Error(
            `auth.sessionMaxAgeSeconds (AUTH_SESSION_MAX_AGE_SECONDS) must be a positive number of seconds, got ${JSON.stringify(value)}`,
        );
    }
    return seconds;
}
