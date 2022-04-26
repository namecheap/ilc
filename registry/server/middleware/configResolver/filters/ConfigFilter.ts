import { ConfigAccessor } from "../../../config";
import { BaseNodeFilter, Node } from "./BaseNodeFilter";

export class ConfigFilter {
    private readonly accessor: ConfigAccessor<object>;

    constructor(
        data: Node | Node[] | object,
    ) {
        this.accessor = new ConfigAccessor(data);
    }

    filter(filters: BaseNodeFilter[]): Node | Node[] | object  {
        filters.forEach(handler => {
            const { accessPath } = handler;
            const node = this.accessor.get<Node[]>(accessPath);
            if(!node) throw new Error(
                `Incorrect path provided: ${accessPath}`
            );

            const result = handler.filter(node);
            this.accessor.set(accessPath, result)
        });

        return this.accessor.get();
    }
}
