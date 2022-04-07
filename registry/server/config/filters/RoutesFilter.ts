import { BaseNodeFilter, Node } from './BaseNodeFilter';

export class RoutesFilter extends BaseNodeFilter {
    public readonly accessPath = 'routes' as const;

    public filter(node: Array<Node>): Array<Node> {
        const accum: [Node[], Node[]] = [[], []];
        const [ withDomain, withoutDomain ] = node.reduce(
            ([ left, right ], { domain, ...rest }) => {
                if(!domain) {
                    right.push(rest);
                }

                if(this.predicate === domain) {
                    left.push(rest);
                }

                return [ left, right ];
            }, accum);

        return withDomain.length ? withDomain : withoutDomain;
    }
}
