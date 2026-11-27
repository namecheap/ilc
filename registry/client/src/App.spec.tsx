import { render, screen, within } from '@testing-library/react';
import Cookies from 'js-cookie';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from './App';
import { stubApi } from './testUtils';

const navbar = { name: '@portal/navbar', kind: 'essential', spaBundle: 'https://cdn.example.com/navbar.js' };

/** Opens the app at a route of its hash router, for a user of a role, or for nobody */
function openApp(route: string, role?: 'admin' | 'readonly') {
    stubApi({
        '/auth/available-methods': ['local'],
        '/auth/logout': {},
        '/api/v1/app': [navbar],
        '/api/v1/app/@portal/navbar': navbar,
        '/api/v1/shared_props': [],
        '/api/v1/router_domains': [],
        // The layout checks whether a new version of the UI is deployed
        '/': '<html></html>',
    });
    if (role) {
        Cookies.set('ilcUserInfo', JSON.stringify({ identifier: 'user', role }));
    }
    window.location.hash = `#${route}`;

    return render(<App />);
}

describe('App', () => {
    afterEach(() => {
        window.location.hash = '';
    });

    it('asks an anonymous visitor to sign in', async () => {
        openApp('/app');

        expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
        expect(screen.queryByText('@portal/navbar')).not.toBeInTheDocument();
    });

    it('has a page for every entity of the Registry, and opens the apps first', async () => {
        openApp('/', 'admin');

        expect(await screen.findByText('@portal/navbar')).toBeInTheDocument();
        const menu = within(screen.getByRole('menu'));
        expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
            'Apps',
            'Shared props',
            'Shared libs',
            'Templates',
            'Routes',
            'Router domains',
            'Auth entities',
            'Settings',
            'History',
        ]);
    });

    it('lets an admin edit a record', async () => {
        openApp('/app/%40portal%2Fnavbar', 'admin');

        expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('shows a read-only user the record on its edit route', async () => {
        openApp('/app/%40portal%2Fnavbar', 'readonly');

        expect(await screen.findByText('Essential')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('offers a read-only user no page to create a record', async () => {
        openApp('/app', 'readonly');

        await screen.findByText('@portal/navbar');
        expect(screen.queryByRole('link', { name: 'Create' })).not.toBeInTheDocument();
    });

    it('shows a failed OAuth authorization without the layout, also to an anonymous visitor', async () => {
        openApp('/oauth/error?error=invalid_client');

        expect(await screen.findByText('Authorization failed')).toBeInTheDocument();
        expect(screen.getByText('invalid_client')).toBeInTheDocument();
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});
