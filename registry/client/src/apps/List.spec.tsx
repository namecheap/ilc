import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { filterOf, renderResource, stubApi, stubSmallScreen } from '../testUtils';

import { apps } from './index';

function stubApps(routerDomains: object[] = [{ id: 1, domainName: 'example.com' }]) {
    return stubApi({
        '/api/v1/app': [
            { name: '@portal/navbar', kind: 'essential', configSelector: ['shared'], enforceDomain: 1 },
            { name: '@portal/system', kind: 'primary', configSelector: [], protected: true },
        ],
        '/api/v1/shared_props': [{ name: 'shared' }],
        '/api/v1/router_domains': routerDomains,
    });
}

describe('AppList', () => {
    it('lists the apps with their shared props and domain', async () => {
        stubApps();
        renderResource('app', apps, '/app');

        const navbar = (await screen.findByText('@portal/navbar')).closest('tr')!;
        expect(within(navbar).getByText('essential')).toBeInTheDocument();
        expect(await within(navbar).findByText('shared')).toBeInTheDocument();
        expect(await within(navbar).findByText('example.com')).toBeInTheDocument();
        expect(await within(navbar).findByRole('link', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/app/%40portal%2Fnavbar',
        );
    });

    it('does not let a protected app be edited', async () => {
        stubApps();
        renderResource('app', apps, '/app');

        const system = (await screen.findByText('@portal/system')).closest('tr')!;
        expect((await within(system).findByText('Edit')).closest('a')).toHaveAttribute('aria-disabled', 'true');
    });

    it('offers to create an app', async () => {
        stubApps();
        renderResource('app', apps, '/app');

        expect(await screen.findByRole('link', { name: 'Create' })).toHaveAttribute('href', '/app/create');
    });

    it('filters by the apps that belong to no domain', async () => {
        const requests = stubApps();
        renderResource('app', apps, '/app');

        await userEvent.click(await screen.findByRole('combobox', { name: 'Domain' }));
        await userEvent.click(screen.getByRole('option', { name: 'Non-specified' }));

        await waitFor(() => expect(requests.map(filterOf)).toContainEqual({ domainId: 'null' }));
    });

    it('has no domain filter without router domains', async () => {
        stubApps([]);
        renderResource('app', apps, '/app');

        await screen.findByText('@portal/navbar');
        expect(screen.getByRole('combobox', { name: 'Kind' })).toBeInTheDocument();
        expect(screen.queryByRole('combobox', { name: 'Domain' })).not.toBeInTheDocument();
    });

    it('lists names and kinds on a small screen', async () => {
        stubSmallScreen();
        stubApps();
        renderResource('app', apps, '/app');

        expect(await screen.findByText('@portal/navbar')).toBeInTheDocument();
        expect(screen.getByText('essential')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('lets a read-only user only look', async () => {
        stubApps();
        renderResource('app', apps, '/app', { role: 'readonly' });

        await screen.findByText('@portal/navbar');
        await expect.poll(() => screen.queryByText('Edit')).not.toBeInTheDocument();
        expect(screen.queryByText('Create')).not.toBeInTheDocument();
    });
});
