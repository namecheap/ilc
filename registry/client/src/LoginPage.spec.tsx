import { QueryClient } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminContext, TestMemoryRouter, defaultI18nProvider } from 'react-admin';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authProvider } from './authProvider';
import { LoginPage } from './LoginPage';

// With the real authProvider the visitor is anonymous. Without one react-admin takes everybody
// for signed in, and its login page sends them on to the dashboard
function renderLoginPage(methods: string[] | Response, route = '/login') {
    vi.mocked(fetch).mockResolvedValue(
        methods instanceof Response ? methods : new Response(JSON.stringify(methods), { status: 200 }),
    );

    return render(
        <TestMemoryRouter initialEntries={[route]}>
            <AdminContext
                authProvider={authProvider}
                i18nProvider={defaultI18nProvider}
                // A failed load is not tried again, which takes seconds
                queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
            >
                <LoginPage />
            </AdminContext>
        </TestMemoryRouter>,
    );
}

describe('LoginPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('offers the local login only when OpenID is off', async () => {
        renderLoginPage(['local']);

        expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Username/)).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Login with OpenID' })).not.toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith('/auth/available-methods', expect.anything());
    });

    it('offers OpenID when it is on', async () => {
        renderLoginPage(['local', 'openid']);

        expect(await screen.findByRole('link', { name: 'Login with OpenID' })).toHaveAttribute('href', '/auth/openid');
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('offers no login form when only OpenID is on', async () => {
        renderLoginPage(['openid']);

        await screen.findByRole('link', { name: 'Login with OpenID' });
        expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    });

    it('shows the login methods again when the Back button returns from the OpenID provider', async () => {
        renderLoginPage(['local', 'openid']);
        const openIdLink = await screen.findByRole('link', { name: 'Login with OpenID' });
        // jsdom does not navigate, the page only switches to its spinner
        openIdLink.addEventListener('click', (event) => event.preventDefault());
        await userEvent.click(openIdLink);
        expect(screen.queryByRole('link', { name: 'Login with OpenID' })).not.toBeInTheDocument();

        // The browser restores the page from its back/forward cache
        act(() => {
            window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        });

        expect(screen.getByRole('link', { name: 'Login with OpenID' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('tells when the login methods cannot be loaded', async () => {
        renderLoginPage(new Response(null, { status: 503, statusText: 'Service Unavailable' }));

        expect(await screen.findByText('Unable to load the login methods: Service Unavailable')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    });

    it('tells which OAuth client the login continues', async () => {
        renderLoginPage(['local'], '/login?client=ilc-overrides&scope=override%3Asign');

        await screen.findByRole('button', { name: 'Sign in' });
        expect(screen.getByText('ilc-overrides')).toBeInTheDocument();
        expect(screen.getByText('override:sign')).toBeInTheDocument();
    });
});
