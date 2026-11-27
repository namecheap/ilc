import { useGetList, type RaRecord } from 'react-admin';

// The API pages router domains, and the selects and checks built on this list need all of them
const ALL_ROUTER_DOMAINS = { page: 1, perPage: 1000 };

/**
 * All router domains, an empty list while they load. ILC works in multi-domain mode once there is at least one.
 */
export function useRouterDomains(): RaRecord[] {
    const { data } = useGetList('router_domains', { pagination: ALL_ROUTER_DOMAINS });

    return data ?? [];
}

/**
 * Choices of a "Domain" list filter: every router domain, plus the records that belong to no domain.
 */
export function useRouterDomainFilterChoices(): RaRecord[] {
    const routerDomains = useRouterDomains();

    // 'null' is the value the API takes for "no domain", see the domainId filter of its list endpoints
    return routerDomains.length ? [{ id: 'null', domainName: 'Non-specified' }, ...routerDomains] : [];
}
