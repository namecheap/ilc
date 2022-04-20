import { BaseNodeFilter, Node } from './BaseNodeFilter';

export class RoutesFilter extends BaseNodeFilter {
    public readonly accessPath = 'routes' as const;

    public filter(node: Array<Node>): Array<Node> {
        const accum: [Node[], Node[]] = [[], []];
        const [ withDomain, withoutDomain ] = node.reduce(
            ([ left, right ], { domain, ...rest }) => {
                if(typeof domain !== 'string') {
                    right.push(rest);
                }

                const option = domain as string;

                if(super.canResolve(option)) {
                    left.push(rest);
                }

                return [ left, right ];
            }, accum);

        return withDomain.length ? withDomain : withoutDomain;
    }
}
