import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, stubSmallScreen } from '../testUtils';

import { routerDomains } from './index';

function stubRouterDomains() {
    return stubApi({
        '/api/v1/router_domains': [
            { id: 1, domainName: 'example.com', template500: '500', canonicalDomain: 'www.example.com' },
            { id: 2, domainName: 'example.org', template500: '500' },
        ],
        '/api/v1/template': [{ name: '500' }],
    });
}

describe('RouterDomainList', () => {
    it('lists the router domains', async () => {
        stubRouterDomains();
        renderResource('router_domains', routerDomains, '/router_domains');

        const row = (await screen.findByText('example.com')).closest('tr')!;
        expect(await within(row).findByText('500')).toBeInTheDocument();
        expect(within(row).getByText('www.example.com')).toBeInTheDocument();
        expect(await within(row).findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/router_domains/1');
    });

    it('marks the values a router domain does not have', async () => {
        stubRouterDomains();
        renderResource('router_domains', routerDomains, '/router_domains');

        const row = (await screen.findByText('example.org')).closest('tr')!;
        // Canonical domain and alias
        expect(within(row).getAllByText('-')).toHaveLength(2);
    });

    it('lists ids and domain names on a small screen', async () => {
        stubSmallScreen();
        stubRouterDomains();
        renderResource('router_domains', routerDomains, '/router_domains');

        expect(await screen.findByText('example.com')).toBeInTheDocument();
        expect(screen.getByText('example.org')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
