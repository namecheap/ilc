import { createHash } from 'node:crypto';
import type { ExperimentId, ExperimentVariant, VariantName } from './interfaces';

const BUCKET_COUNT = 100;

/**
 * Deterministic hash of the bucketing seed → unsigned 32-bit integer.
 *
 * Determinism is the whole correctness story: the same `(sessionId, experimentId)`
 * pair must always resolve to the same bucket on every ILC pod and across Node
 * versions, otherwise a visitor could flip variants between requests. We use Node's
 * built-in `crypto` (SHA-256) rather than a hand-rolled or third-party hash because
 * the digest is standardised and stable across Node versions and platforms — exactly
 * the cross-pod / cross-version stickiness guarantee we need — with no extra
 * dependency. The first 4 bytes of the digest are read as a big-endian uint32.
 */
export function hashSeed(seed: string): number {
    return createHash('sha256').update(seed).digest().readUInt32BE(0);
}

/**
 * Resolve a variant for a session using weighted, contiguous buckets.
 *
 * The visitor is placed in a stable bucket `[0, 100)`; variants own contiguous
 * weight slices in declaration order. Because slices are contiguous and order
 * is stable, growing one variant's weight only ever pulls visitors *into* it
 * from the slice boundary — it never re-shuffles already-assigned visitors
 * across unrelated variants.
 *
 * @returns the resolved variant name, or `undefined` when no variants exist.
 */
export function bucketVariant(
    sessionId: string,
    experimentId: ExperimentId,
    variants: readonly ExperimentVariant[],
): VariantName | undefined {
    if (variants.length === 0) {
        return undefined;
    }

    const bucket = hashSeed(`${sessionId}:${experimentId}`) % BUCKET_COUNT;

    let cumulative = 0;
    for (const variant of variants) {
        cumulative += variant.weight;
        if (bucket < cumulative) {
            return variant.name;
        }
    }

    // Weights summed to < 100: fall back to the first (baseline) variant.
    return variants[0].name;
}
