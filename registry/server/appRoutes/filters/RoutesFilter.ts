import { BaseNodeFilter, Node } from './BaseNodeFilter';
import {extractHost} from "../guards";

export class RoutesFilter extends BaseNodeFilter {
    public readonly accessPath = 'routes' as const;

    public filter(node: Array<Node>): object {
        const accum: [Node[], Node[]] = [[], []];
        const [ withDomain, withoutDomain ] = node.reduce(
            ([ left, right ], data) => {
                const { domainName, ...rest } = data;
                if(typeof domainName !== 'string') {
                    right.push(rest);
                }

                const option = extractHost(domainName as string);

                if(super.canResolve(option)) {
                    left.push(data);
                }

                return [ left, right ];
            }, accum);

        return withDomain.length ? withDomain : withoutDomain;
    }
}
