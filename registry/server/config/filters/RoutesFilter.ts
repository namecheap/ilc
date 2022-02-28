import { BaseNodeFilter, Node } from './BaseNodeFilter';

export class RoutesFilter extends BaseNodeFilter {
    public static readonly accessPath = 'routes' as const;

    public filter(predicate: string): Array<Node> {
        const accum: [Node[], Node[]] = [[], []];
        const [ withDomain, withoutDomain ] = this.node.reduce(
            ([ left, right ], { domain, ...rest }) => {
                if(!domain) {
                    right.push(rest);
                }

                if(predicate === domain) {
                    left.push(rest);
                }

                return [ left, right ];
            }, accum);

        return withDomain.length ? withDomain : withoutDomain;
    }
}
