import db from "../../db";
import RouterDomains from "../../routerDomains/interfaces";

export const patchRoute = async (
    { ...route }, patch = { domainName: '*' }
): Promise<typeof route> => {
    const { domainId, domainName } = route;

    if(domainName) {
        return route;
    }

    if(domainId) {
        const [ result ] = await db.select()
            .from<RouterDomains>('router_domains')
            .where({ id: domainId });

        if(result) {
            route.domainName = result?.domainName;
        }
    }

    Object.entries(patch).forEach(([key, val]) => {
        route[key] == null ? route[key] = val : null
    });

    return route;
}
