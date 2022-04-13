export type Node = Record<string, unknown>;

export abstract class BaseNodeFilter {
    public abstract accessPath: string;
    public readonly predicates: Array<string>;
    protected readonly rootDomain = '*' as const;

    constructor(predicates: Array<string>) {
        this.predicates = [ ...predicates, this.rootDomain ];
    }

    public abstract filter(data: Readonly<Node[]>): Node | Node[];

    protected canResolve(property: string): boolean {
        return this.predicates.includes(property);
    }
}
