import type { FragmentResponseSnapshot } from '../response-snapshot';
import type { FragmentResponse } from '../../fragment-render';
import type { RefusalReason } from './refusal';

export type Entry =
    | { kind: 'response'; snapshot: FragmentResponseSnapshot }
    // the tombstone remembers why it was written, so a replay reports the original cause
    // rather than a second, contextless refusal
    | { kind: 'refusal'; reason: RefusalReason };

export type CacheLookup =
    | { kind: 'miss' }
    | { kind: 'fresh'; snapshot: FragmentResponseSnapshot }
    | { kind: 'stale'; snapshot: FragmentResponseSnapshot }
    | { kind: 'refusal'; reason: RefusalReason };

export type FragmentCacheOutcome =
    | { source: 'hit' | 'stale' | 'miss'; response: FragmentResponse }
    | { source: 'refuse'; reason: RefusalReason };

export interface FragmentCacheRequest {
    ttlSeconds: number;
    timeoutMs: number;
    load: () => Promise<FragmentResponse>;
}
