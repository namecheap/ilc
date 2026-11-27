import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi } from '../testUtils';

import { routerDomains } from './index';

describe('RouterDomainShow', () => {
    it('shows a router domain', async () => {
        stubApi({
            '/api/v1/router_domains/1': {
                id: 1,
                domainName: 'example.com',
                template500: '500',
                props: { apiUrl: 'https://api.example.com' },
            },
            '/api/v1/template': [{ name: '500' }],
        });
        renderResource('router_domains', routerDomains, '/router_domains/1/show');

        expect(await screen.findByText('Router Domains #1')).toBeInTheDocument();
        expect(screen.getByText('example.com')).toBeInTheDocument();
        expect(await screen.findByText('500')).toBeInTheDocument();
        expect(screen.getByText('apiUrl')).toBeInTheDocument();
        // No canonical domain
        expect(screen.getByText('-')).toBeInTheDocument();
    });
});
