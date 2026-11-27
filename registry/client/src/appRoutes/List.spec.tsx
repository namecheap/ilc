import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { filterOf, renderResource, stubApi, stubSmallScreen, type ApiRequest } from '../testUtils';

import { appRoutes } from './index';

const news = { id: 1, orderPos: 10, route: '/news/*', next: false, templateName: 'master', domainId: 1 };
const notFound = { id: 2, specialRole: '404', templateName: 'master' };

function stubRoutes(routerDomains: object[] = [{ id: 1, domainName: 'example.com' }]) {
    return stubApi({
        '/api/v1/route': (request: ApiRequest) => (filterOf(request).showSpecial ? [notFound] : [news]),
        '/api/v1/template': [{ name: 'master' }],
        '/api/v1/router_domains': routerDomains,
    });
}

describe('AppRouteList', () => {
    it('lists the routes with their template and domain', async () => {
        stubRoutes();
        renderResource('route', appRoutes, '/route');

        const row = (await screen.findByText('/news/*')).closest('tr')!;
        expect(within(row).getByText('10')).toBeInTheDocument();
        expect(await within(row).findByText('master')).toBeInTheDocument();
        expect(await within(row).findByText('example.com')).toBeInTheDocument();
        expect(await within(row).findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/route/1');
        expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/route/create');
    });

    it('lists the special routes instead when asked to', async () => {
        const requests = stubRoutes();
        renderResource('route', appRoutes, '/route');
        await screen.findByText('/news/*');
        expect(screen.getByRole('textbox', { name: 'Route prefix' })).toBeInTheDocument();

        await userEvent.click(screen.getByLabelText('Show special'));

        const row = (await screen.findByText('404')).closest('tr')!;
        expect(await within(row).findByText('master')).toBeInTheDocument();
        expect(screen.queryByText('/news/*')).not.toBeInTheDocument();
        expect(requests.map(filterOf)).toContainEqual({ showSpecial: true });
        // A special route has no path to filter by
        expect(screen.queryByRole('textbox', { name: 'Route prefix' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Create special route' })).toHaveAttribute(
            'href',
            '/route/create?special=1',
        );
    });

    it('filters by a domain', async () => {
        const requests = stubRoutes();
        renderResource('route', appRoutes, '/route');

        await userEvent.click(await screen.findByRole('combobox', { name: 'Domain' }));
        await userEvent.click(screen.getByRole('option', { name: 'example.com' }));

        await waitFor(() => expect(requests.map(filterOf)).toContainEqual({ domainId: 1 }));
    });

    it('has no domain filter without router domains', async () => {
        stubRoutes([]);
        renderResource('route', appRoutes, '/route');

        await screen.findByText('/news/*');
        expect(screen.queryByRole('combobox', { name: 'Domain' })).not.toBeInTheDocument();
    });

    it('lists paths and templates on a small screen', async () => {
        stubSmallScreen();
        stubRoutes();
        renderResource('route', appRoutes, '/route');

        expect(await screen.findByText('/news/*')).toBeInTheDocument();
        expect(screen.getByText('next: false; template: master')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('names a special route by its role on a small screen', async () => {
        stubSmallScreen();
        stubApi({
            '/api/v1/route': [{ id: 2, specialRole: '404', next: true }],
            '/api/v1/router_domains': [],
        });
        renderResource('route', appRoutes, '/route');

        expect(await screen.findByText('404')).toBeInTheDocument();
        expect(screen.getByText('next: true; template: -')).toBeInTheDocument();
    });
});
