import db from '../../db';
import { getJoiErr } from '../../util/helpers';

/**
 * If `domainAlias` is provided, resolves it to a `domainId` by looking up router_domains.
 * Returns the route data with `domainId` set and `domainAlias` removed.
 * Throws a Joi-style error if the alias doesn't match any router domain.
 */
type AppRouteWithDomainAlias = {
    domainId?: number | null;
    domainAlias?: string | null;
};

type ResolvedRouteDomainAlias<T extends AppRouteWithDomainAlias> = Omit<T, 'domainAlias' | 'domainId'> & {
    domainId: number | null;
};

export async function resolveDomainAlias<T extends AppRouteWithDomainAlias>(
    appRoute: T,
): Promise<ResolvedRouteDomainAlias<T>> {
    const { domainAlias, domainId, ...rest } = appRoute;

    if (!domainAlias) {
        return { ...rest, domainId: domainId ?? null } as ResolvedRouteDomainAlias<T>;
    }

    const domain = await db('router_domains').first('id').where({ alias: domainAlias });
    if (!domain) {
        throw getJoiErr('domainAlias', `Router domain with alias "${domainAlias}" does not exist`);
    }

    return { ...rest, domainId: domain.id } as ResolvedRouteDomainAlias<T>;
}
