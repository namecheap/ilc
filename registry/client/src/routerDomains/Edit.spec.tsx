import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi, writes } from '../testUtils';

import { routerDomains } from './index';

const example = { id: 1, domainName: 'example.com', template500: '500', props: { apiUrl: 'https://api.example.com' } };

function stubRouterDomains(routes: Record<string, unknown> = {}) {
    return stubApi({
        '/api/v1/router_domains/1': example,
        '/api/v1/template': [{ name: '500' }, { name: 'master' }],
        ...routes,
    });
}

async function save() {
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('RouterDomainEdit', () => {
    it('updates a router domain', async () => {
        const requests = stubRouterDomains();
        renderResource('router_domains', routerDomains, '/router_domains/1');

        expect(await screen.findByText('Router Domains #1')).toBeInTheDocument();
        await userEvent.type(screen.getByRole('textbox', { name: 'Canonical Domain' }), 'www.example.com');
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toEqual({
            method: 'PUT',
            path: '/api/v1/router_domains/1',
            query: expect.anything(),
            body: {
                domainName: 'example.com',
                template500: '500',
                canonicalDomain: 'www.example.com',
                props: { apiUrl: 'https://api.example.com' },
            },
        });
    });

    it('explains the two kinds of props a domain has', async () => {
        stubRouterDomains();
        renderResource('router_domains', routerDomains, '/router_domains/1');

        await userEvent.click(await screen.findByRole('tab', { name: 'Domain Props' }));

        expect(screen.getByText(/^Properties available in browser/)).toBeInTheDocument();
        expect(screen.getByText(/^Server-side only properties/)).toBeInTheDocument();
    });
});

describe('RouterDomainCreate', () => {
    it('creates a router domain', async () => {
        const requests = stubRouterDomains({
            'POST /api/v1/router_domains': { id: 2, domainName: 'example.org', template500: '500' },
            '/api/v1/router_domains/2': { id: 2, domainName: 'example.org', template500: '500' },
        });
        renderResource('router_domains', routerDomains, '/router_domains/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Domain name' }), 'example.org');
        await userEvent.click(screen.getByRole('combobox', { name: /Template of 500 error/ }));
        await userEvent.click(await screen.findByRole('option', { name: '500' }));
        await save();

        await waitFor(() => expect(writes(requests)).toHaveLength(1));
        expect(writes(requests)[0]).toMatchObject({
            method: 'POST',
            path: '/api/v1/router_domains',
            body: { domainName: 'example.org', template500: '500' },
        });
    });

    it('does not create a router domain without a name and a template for errors', async () => {
        const requests = stubRouterDomains();
        renderResource('router_domains', routerDomains, '/router_domains/create');

        await userEvent.type(await screen.findByRole('textbox', { name: 'Alias' }), 'example');
        await save();

        expect(await screen.findAllByText('Required')).toHaveLength(2);
        expect(writes(requests)).toHaveLength(0);
    });
});
