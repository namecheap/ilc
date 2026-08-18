import type { Logger } from 'ilc-plugins-sdk';
import { PendingCallRegistry } from './pending-call-registry';
import { withTimeout } from '../../../common/utils';
import { explainResponseRefusal } from './utils/policy';
import { DEFAULT_CAPACITY_BUDGET, type CapacityBudget } from './utils/capacity-budget';
import { FragmentResponseSnapshot } from './response-snapshot';
import type { FragmentResponse } from './../fragment-render';
import type { FragmentCacheOutcome, FragmentCacheRequest } from './types/cache';
import type { FragmentCacheStore } from './store';
import type { RefusalReason } from './types/refusal';

/** What a single capture attempt yielded: a stored snapshot, or a named refusal. */
type CaptureOutcome = { ok: true; snapshot: FragmentResponseSnapshot } | { ok: false; reason: RefusalReason };

export class FragmentResponseCache {
    private readonly pendingCalls = new PendingCallRegistry<CaptureOutcome>();

    constructor(
        private readonly store: FragmentCacheStore,
        private readonly logger: Logger,
        private readonly capacity: CapacityBudget = DEFAULT_CAPACITY_BUDGET,
    ) {}

    async get(key: string, request: FragmentCacheRequest): Promise<FragmentCacheOutcome> {
        const cached = this.store.lookup(key, request.ttlSeconds);

        if (cached.kind === 'fresh') {
            return { source: 'hit', response: cached.snapshot.replay() };
        }
        if (cached.kind === 'refusal') {
            return { source: 'refuse', reason: cached.reason };
        }
        if (cached.kind === 'stale') {
            // a refresh already in flight needs no extra join; a saturated budget only postpones a new one
            if (!this.pendingCalls.has(key) && !this.isOverCaptureBudget(key)) {
                this.refreshInBackground(key, request);
            }
            return { source: 'stale', response: cached.snapshot.replay() };
        }

        // Cold miss with no capture slot left: render privately instead of buffering,
        // so concurrent unique misses cannot grow past the in-flight budget
        if (this.isOverCaptureBudget(key)) {
            return { source: 'refuse', reason: 'capture-budget-exhausted' };
        }

        const refreshed = await this.refreshOnce(key, request);
        return refreshed.ok
            ? { source: 'miss', response: refreshed.snapshot.replay() }
            : { source: 'refuse', reason: refreshed.reason };
    }

    /** True while starting a fresh capture would exceed the in-flight buffering budget. */
    private isOverCaptureBudget(key: string): boolean {
        return !this.pendingCalls.has(key) && this.pendingCalls.size >= this.capacity.maxConcurrentCaptures;
    }

    private refreshOnce(key: string, request: FragmentCacheRequest): Promise<CaptureOutcome> {
        const timeoutMessage = `Fragment cache update timeout ${request.timeoutMs}ms`;
        const isStarter = !this.pendingCalls.has(key);

        let inFlight: FragmentResponse | null = null;
        const work = this.pendingCalls.call(key, () => {
            const capture = request.load().then((response) => {
                inFlight = response;
                return this.capture(key, response).finally(() => {
                    inFlight = null;
                });
            });
            capture.catch(() => {});
            return capture;
        });

        const timedWork = withTimeout(work, request.timeoutMs, timeoutMessage);
        if (!isStarter) {
            return timedWork;
        }

        return timedWork.catch((error) => {
            inFlight?.destroy();
            throw error;
        });
    }

    /** Refusal reasons likely to reflect a transient hiccup rather than a deliberate, lasting signal. */
    private static readonly TRANSIENT_REASONS: ReadonlySet<RefusalReason> = new Set([
        'status-not-200',
        'stream-closed-early',
    ]);

    private async capture(key: string, response: FragmentResponse): Promise<CaptureOutcome> {
        const policyRefusal = explainResponseRefusal(response.statusCode, response.headers);
        if (policyRefusal !== null) {
            response.destroy();
            this.storeRefusalUnlessTransient(key, policyRefusal);
            return { ok: false, reason: policyRefusal };
        }

        const captured = await FragmentResponseSnapshot.capture(response, this.capacity.maxBodyBytes);
        if (!captured.ok) {
            this.storeRefusalUnlessTransient(key, captured.reason);
            return captured;
        }

        this.store.storeResponse(key, captured.snapshot);
        return captured;
    }

    /**
     * A transient reason (likely origin blip, not a deliberate opt-out) must not destroy a
     * working stale entry that a refresh was merely trying to update.
     */
    private storeRefusalUnlessTransient(key: string, reason: RefusalReason): void {
        const preserveExisting = FragmentResponseCache.TRANSIENT_REASONS.has(reason) && this.store.hasResponse(key);
        if (!preserveExisting) {
            this.store.storeRefusal(key, reason);
        }
    }

    private refreshInBackground(key: string, request: FragmentCacheRequest): void {
        void this.refreshOnce(key, request).catch((error) => this.logger.error(error));
    }
}
