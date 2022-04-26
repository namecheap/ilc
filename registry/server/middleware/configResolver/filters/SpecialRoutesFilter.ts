import { isEmpty, isString } from 'lodash';
import { BaseNodeFilter, Node } from "./BaseNodeFilter";


export class SpecialRoutesFilter extends BaseNodeFilter {
    public readonly accessPath = 'specialRoutes' as const;

    public filter(node: Array<Node>): Node[] {
        const accum: [Node[], Node[]] = [[], []];
        const [ withDomain, withoutDomain ] = node.reduce(
            ([ left, right ], data) => {
                const { domainName, specialRole, ...rest } = data;

                if(isString(specialRole)) {
                    typeof domainName !== 'string' ? right.push(rest) : (
                        super.canResolve(domainName) ? left.push(data) : null
                    )
                }

                return [ left, right ];
            }, accum);

        return !isEmpty(withDomain) ? withDomain : withoutDomain;
    }
}
