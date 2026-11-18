/** Counts hits per key over a sliding window, in memory, for one process */
export class SlidingWindowRateLimiter {
    private readonly hits = new Map<string, number[]>();

    constructor(
        private readonly limit: number,
        private readonly windowMs: number,
    ) {}

    /** Records a hit for the key and tells whether it is still within the limit */
    tryAcquire(key: string, now = Date.now()): boolean {
        const since = now - this.windowMs;
        const recent = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > since);

        if (recent.length >= this.limit) {
            this.hits.set(key, recent);
            return false;
        }

        recent.push(now);
        this.hits.set(key, recent);
        this.prune(since);
        return true;
    }

    /** Keys that had no hit in the window are dropped, so idle users do not accumulate */
    private prune(since: number): void {
        for (const [key, timestamps] of this.hits) {
            if (timestamps.every((timestamp) => timestamp <= since)) {
                this.hits.delete(key);
            }
        }
    }
}
