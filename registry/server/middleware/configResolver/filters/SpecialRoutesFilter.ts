import { BaseNodeFilter, Node } from "./BaseNodeFilter";

export class SpecialRoutesFilter extends BaseNodeFilter {
    public readonly accessPath = 'specialRoutes' as const;

    public filter(node: Array<Node>): Array<Node> {
        const accum: [Node[], Node[]] = [[], []];
        const [ withDomain, withoutDomain ] = node.reduce(
            ([ left, withoutDomain ], { domain, ...rest }) => {
                if(typeof domain !== 'string') {
                    withoutDomain.push(rest);
                }

                const option = domain as string;

                if(super.canResolve(option)) {
                    left.push(rest);
                }

                return [ left, withoutDomain ];
            }, accum);

        return withDomain.length ? withDomain : withoutDomain;
    }
}
