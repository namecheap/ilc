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
                    !domain ? right[specialRole] = rest : (
                        domain === this.predicate ? left[specialRole] = rest : null
                    )
                }

                return [ left, right ];
            }, accum);

        return !isEmpty(withDomain) ? withDomain : withoutDomain;
    }
}
