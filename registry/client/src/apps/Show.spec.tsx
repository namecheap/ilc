import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderResource, stubApi } from '../testUtils';

import { apps } from './index';

const navbar = {
    name: '@portal/navbar',
    kind: 'essential',
    enforceDomain: 1,
    spaBundle: 'https://cdn.example.com/navbar.js',
    dependencies: { react: 'https://cdn.example.com/react.js' },
    ssr: { src: 'http://navbar.internal/ssr', timeout: 1000 },
    props: { publicPath: '/navbar/' },
    configSelector: ['shared'],
};

function stubApp(app: object) {
    return stubApi({
        '/api/v1/app/@portal/navbar': app,
        '/api/v1/shared_props': [{ name: 'shared' }],
        '/api/v1/router_domains': [{ id: 1, domainName: 'example.com' }],
    });
}

describe('AppShow', () => {
    it('shows the summary of an app', async () => {
        stubApp(navbar);
        renderResource('app', apps, '/app/%40portal%2Fnavbar/show');

        expect(await screen.findByText('App "@portal/navbar"')).toBeInTheDocument();
        expect(screen.getByText('Essential')).toBeInTheDocument();
        expect(await screen.findByText('example.com')).toBeInTheDocument();
        expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/app/%40portal%2Fnavbar');
    });

    it('shows the assets, with the dependencies as a table', async () => {
        stubApp(navbar);
        renderResource('app', apps, '/app/%40portal%2Fnavbar/show');

        await userEvent.click(await screen.findByRole('tab', { name: 'Assets' }));

        expect(await screen.findByRole('link', { name: 'https://cdn.example.com/navbar.js' })).toBeInTheDocument();
        expect(screen.getByText('react')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'https://cdn.example.com/react.js' })).toBeInTheDocument();
    });

    it('shows the SSR settings', async () => {
        stubApp(navbar);
        renderResource('app', apps, '/app/%40portal%2Fnavbar/show');

        await userEvent.click(await screen.findByRole('tab', { name: 'SSR' }));

        expect(await screen.findByRole('link', { name: 'http://navbar.internal/ssr' })).toBeInTheDocument();
        expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('shows the props and the shared props an app gets', async () => {
        stubApp(navbar);
        renderResource('app', apps, '/app/%40portal%2Fnavbar/show');

        await userEvent.click(await screen.findByRole('tab', { name: 'Props' }));

        expect(await screen.findByText('shared')).toBeInTheDocument();
        expect(screen.getByText('publicPath')).toBeInTheDocument();
    });

    it('marks the values an app does not have', async () => {
        stubApp({ name: '@portal/navbar', kind: 'primary', spaBundle: 'https://cdn.example.com/navbar.js' });
        renderResource('app', apps, '/app/%40portal%2Fnavbar/show');

        await screen.findByText('Primary');
        // Domain, wrapper, admin notes and namespace
        expect(screen.getAllByText('<NULL>')).toHaveLength(4);
    });
});
