import { isEmpty, isString } from 'lodash';
import { BaseNodeFilter, Node } from "./BaseNodeFilter";

type Result = Record<string, Partial<Node>>;

export class SpecialRoutesFilter extends BaseNodeFilter {
    public readonly accessPath = 'specialRoutes' as const;

    public filter(node: Array<Node>): Result {
        const accum: [Result, Result] = [{}, {}];
        const [ withDomain, withoutDomain ] = node.reduce(
            ([ left, right ], { domain, specialRole, ...rest }) => {
                if(isString(specialRole)) {
                    typeof domain !== 'string' ? right[specialRole] = rest : (
                        super.canResolve(domain) ? left[specialRole] = rest : null
                    )
                }

                return [ left, right ];
            }, accum);

        return !isEmpty(withDomain) ? withDomain : withoutDomain;
    }
}
