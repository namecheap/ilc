import db from '../../db';
import { getJoiErr } from '../../util/helpers';

type AppWithDomainAlias = {
    enforceDomain?: number | null;
    domainAlias?: string | null;
};

type ResolvedAppDomainAlias<T extends AppWithDomainAlias> = Omit<T, 'domainAlias'>;

export async function resolveDomainAlias<T extends AppWithDomainAlias>(app: T): Promise<ResolvedAppDomainAlias<T>> {
    const { domainAlias, enforceDomain, ...rest } = app;

    if (!domainAlias) {
        if (enforceDomain === undefined) {
            return rest as ResolvedAppDomainAlias<T>;
        }

        return { ...rest, enforceDomain } as ResolvedAppDomainAlias<T>;
    }

    const domain = await db('router_domains').first('id').where({ alias: domainAlias });
    if (!domain) {
        throw getJoiErr('domainAlias', `Router domain with alias "${domainAlias}" does not exist`);
    }

    return { ...rest, enforceDomain: domain.id } as ResolvedAppDomainAlias<T>;
}
