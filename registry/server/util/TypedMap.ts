export class TypedMap<T> extends Map {
    override get<K extends keyof T>(key: K): T[K] {
        return super.get(key);
    }

    override set<K extends keyof T>(key: K, value: T[K]) {
        return super.set(key, value);
    }
}
