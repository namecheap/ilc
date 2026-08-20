export class PendingCallRegistry<T> {
    private readonly pending = new Map<string, Promise<T>>();

    call(key: string, start: () => Promise<T>): Promise<T> {
        const existing = this.pending.get(key);
        if (existing !== undefined) {
            return existing;
        }
        const work = start().finally(() => this.pending.delete(key));
        this.pending.set(key, work);
        return work;
    }

    has(key: string): boolean {
        return this.pending.has(key);
    }

    get size(): number {
        return this.pending.size;
    }
}
