export type Node = Record<string, unknown>;


export abstract class BaseNodeFilter {
    public abstract accessPath: string;
    public readonly predicates: Array<string>;

    constructor(predicates: Array<string>, defaults = '*') {
        this.predicates = [ ...predicates, defaults ];
    }

    public abstract filter(data: Readonly<Node[]>): object;

    protected canResolve(property: string): boolean {
        return this.predicates.includes(property);
    }
}
