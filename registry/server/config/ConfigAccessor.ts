import { cloneDeep, get, set } from "lodash";

export class ConfigAccessor<T extends Record<string, unknown> | object> {
    private data: T;

    constructor(data: T) {
        this.data = cloneDeep(data);
    }

    public get<V>(path: string = ''): Readonly<V> {
        if(!path) return this.data as V;

        const node = get(this.data, path);
        return Object.freeze(node) as V;
    }

    public set<V>(path: string, value: unknown): Readonly<V> {
        this.data = set(this.data, path, value);
        return Object.freeze(this.data) as V;
    }
}
