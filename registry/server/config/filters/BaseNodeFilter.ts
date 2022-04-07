export type Node = Record<string, unknown>;

export abstract class BaseNodeFilter {
    public abstract accessPath: string;
    constructor(protected readonly predicate: string) {}
    public abstract filter(data: Readonly<Node[]>): Node | Node[];
}
