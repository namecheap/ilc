import { ConfigAccessor } from "../ConfigAccessor";
import { BaseNodeFilter, Node } from "./BaseNodeFilter";

type FilterCtor = new(...args: any[]) => BaseNodeFilter;

export class ConfigFilter {
    private readonly accessor: ConfigAccessor<object>;

    constructor(
        data: Node | Node[] | object,
        private readonly filters: Map<string, FilterCtor>
    ) { this.accessor = new ConfigAccessor(data); }

    filter(predicate: string): Node | Node[] | object  {
        this.filters.forEach((Ctor, path) => {
            const node = this.accessor.get(path);
            if(!node) throw new Error(
                `Incorrect path provided: ${path}`
            );

            const handler = new Ctor(node);
            const result = handler.filter(predicate);
            this.accessor.set(path, result)
        });

        return this.accessor.get();
    }
}
