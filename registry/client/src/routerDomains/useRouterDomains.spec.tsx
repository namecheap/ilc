import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AdminContext } from 'react-admin';
import { describe, expect, it } from 'vitest';

import { dataProvider } from '../dataProvider';
import { stubApi } from '../testUtils';

import { useRouterDomainFilterChoices, useRouterDomains } from './useRouterDomains';

function wrapper({ children }: { children: ReactNode }) {
    return <AdminContext dataProvider={dataProvider}>{children}</AdminContext>;
}

const example = { id: 1, domainName: 'example.com' };

describe('useRouterDomains', () => {
    it('gives all router domains, and none while they load', async () => {
        const requests = stubApi({ '/api/v1/router_domains': [example] });

        const { result } = renderHook(() => useRouterDomains(), { wrapper });

        expect(result.current).toEqual([]);
        await waitFor(() => expect(result.current).toEqual([example]));
        // More than the API gives on a page by default
        expect(requests[0].query.get('range')).toBe('[0,999]');
    });
});

describe('useRouterDomainFilterChoices', () => {
    it('offers every router domain, and the records of no domain', async () => {
        stubApi({ '/api/v1/router_domains': [example] });

        const { result } = renderHook(() => useRouterDomainFilterChoices(), { wrapper });

        await waitFor(() => expect(result.current).toEqual([{ id: 'null', domainName: 'Non-specified' }, example]));
    });

    it('offers nothing when ILC serves a single domain', async () => {
        const requests = stubApi({ '/api/v1/router_domains': [] });

        const { result } = renderHook(() => useRouterDomainFilterChoices(), { wrapper });

        await waitFor(() => expect(requests).toHaveLength(1));
        expect(result.current).toEqual([]);
    });
});
