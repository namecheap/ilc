export type Node = Record<string, unknown>;

export abstract class BaseNodeFilter {
    public static accessPath: string;
    constructor(public readonly node: Array<Node>) {}
    public abstract filter(predicate: unknown): Node | Node[];
}
