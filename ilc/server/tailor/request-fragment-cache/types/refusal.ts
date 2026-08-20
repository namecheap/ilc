/**
 * Every reason a fragment response can fail to be served from, or admitted to, the shared cache —
 * the single home of the taxonomy (rules stay where enforced). Each reason reaches the New Relic
 * metric, the HTML marker, and the log line; adding one here fails compilation everywhere it must
 * be handled. A const tuple, not a bare union, so the set is also enumerable at runtime — the spec
 * tests every reason against this list instead of a hand-maintained count.
 */
export const REFUSAL_REASONS = [
    /* Request stage — decided by explainRequestRefusal, before the fragment is contacted. */
    /** The fragment never opted in: no `cache` config, or `enabled` is not exactly true. */
    'cache-disabled',
    /** `ttlSeconds` is missing, not an integer, or not positive. */
    'ttl-invalid',
    /** `ttlSeconds` exceeds the 30-day ceiling shared with the registry schema. */
    'ttl-too-long',
    /** The fragment renders inside a wrapper, whose own output is not covered by the cache key. */
    'wrapper-conf',
    /** The fragment forwards the query string, which the cache key deliberately strips. */
    'forward-querystring',
    /** The route has a special role (404 and friends); those renders are never shared. */
    'special-role-route',
    /** No `x-request-host` to vary on, so a shared entry could leak across hosts. */
    'no-vary-host',
    /** Local development environment request: rendered privately so the developer sees live output. */
    'lde-request',

    /* Response stage — decided by explainResponseRefusal, once the origin has answered. */
    /** Only 200 responses are shared; anything else may be transient or user-specific. */
    'status-not-200',
    /** The response sets cookies, the clearest signal that it was personalised. */
    'set-cookie',
    /** `Cache-Control` carries a directive forbidding reuse without revalidation (RFC 9111 §5.2.2). */
    'cache-control',

    /* Capture stage — decided while the body is being buffered. */
    /** The body exceeded the per-response byte cap before it finished. */
    'body-too-large',
    /** The stream closed without an `end`, so the buffered body would be truncated. */
    'stream-closed-early',
    /** `Content-Encoding` is not one this cache can replay. */
    'unsupported-encoding',
    /** Decompression failed, including hitting the decompressed-size guard. */
    'decode-failed',

    /* Runtime stage — decided by the cache's own capacity accounting. */
    /** Every concurrent-capture slot is taken; the render proceeds privately instead of buffering. */
    'capture-budget-exhausted',
    /** The shared probe outlived the render deadline, so this render is served privately instead. */
    'render-deadline',
] as const;

export type RefusalReason = (typeof REFUSAL_REASONS)[number];
