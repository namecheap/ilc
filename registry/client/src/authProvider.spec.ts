import Cookies from 'js-cookie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authProvider } from './authProvider';

function signIn(userInfo: { identifier: string; role: string }) {
    Cookies.set('ilcUserInfo', JSON.stringify(userInfo));
}

describe('authProvider', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    });

    afterEach(() => {
        Cookies.remove('ilcUserInfo');
        window.location.hash = '';
        vi.unstubAllGlobals();
    });

    describe('checkAuth', () => {
        it('passes with the user info cookie', async () => {
            signIn({ identifier: 'root', role: 'admin' });

            await expect(authProvider.checkAuth({})).resolves.toBeUndefined();
        });

        it('fails without the user info cookie', async () => {
            await expect(authProvider.checkAuth({})).rejects.toBeUndefined();
        });
    });

    describe('checkError', () => {
        it('ends the session on 401 only', async () => {
            await expect(authProvider.checkError({ status: 401 })).rejects.toBeUndefined();
            await expect(authProvider.checkError({ status: 422 })).resolves.toBeUndefined();
        });
    });

    it('takes the role as permissions', async () => {
        signIn({ identifier: 'viewer', role: 'readonly' });

        await expect(authProvider.getPermissions?.({})).resolves.toBe('readonly');
    });

    it('gives an anonymous user no permissions', async () => {
        await expect(authProvider.getPermissions?.({})).resolves.toBeNull();
    });

    it('lets a read-only user only list and show records', async () => {
        signIn({ identifier: 'viewer', role: 'readonly' });

        for (const action of ['list', 'show']) {
            await expect(authProvider.canAccess?.({ action, resource: 'app' })).resolves.toBe(true);
        }
        for (const action of ['create', 'edit', 'delete', 'revert']) {
            await expect(authProvider.canAccess?.({ action, resource: 'app' })).resolves.toBe(false);
        }
    });

    it('lets an admin do everything', async () => {
        signIn({ identifier: 'root', role: 'admin' });

        for (const action of ['list', 'show', 'create', 'edit', 'delete', 'revert']) {
            await expect(authProvider.canAccess?.({ action, resource: 'app' })).resolves.toBe(true);
        }
    });

    it('shows who is signed in and with which access', async () => {
        signIn({ identifier: 'root', role: 'admin' });

        await expect(authProvider.getIdentity?.()).resolves.toEqual({
            id: 'root',
            fullName: 'root ("admin" access)',
        });
    });

    it('has no identity for an anonymous user', async () => {
        await expect(authProvider.getIdentity?.()).rejects.toThrow('Unauthorized');
    });

    describe('login', () => {
        it('posts the credentials', async () => {
            await authProvider.login({ username: 'root', password: 'pwd' });

            expect(fetch).toHaveBeenCalledWith(
                '/auth/local',
                expect.objectContaining({ method: 'POST', body: '{"username":"root","password":"pwd"}' }),
            );
        });

        it('fails with the status text of a rejected login', async () => {
            vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401, statusText: 'Unauthorized' }));

            await expect(authProvider.login({ username: 'root', password: 'wrong' })).rejects.toThrow('Unauthorized');
        });

        it('does not follow a returnTo that leaves the origin', async () => {
            // The last one is not a URL at all
            for (const returnTo of ['https://evil.example.com/', '//evil.example.com/', '/\\evil.example.com', '//[']) {
                window.location.hash = `#/login?returnTo=${encodeURIComponent(returnTo)}`;

                // Resolves, so react-admin goes on to its own page, while a followed returnTo never settles
                await expect(authProvider.login({ username: 'root', password: 'pwd' })).resolves.toBeUndefined();
            }
        });
    });

    it('leaves the page for a returnTo on this origin, such as a pending OAuth authorization', async () => {
        // jsdom only follows a navigation within the page
        window.location.hash = `#/login?returnTo=${encodeURIComponent('/#/oauth/authorize')}`;
        const settled = vi.fn();

        authProvider.login({ username: 'root', password: 'pwd' }).then(settled, settled);

        await vi.waitFor(() => expect(window.location.hash).toBe('#/oauth/authorize'));
        // react-admin would route to its own page once the login settles
        expect(settled).not.toHaveBeenCalled();
    });

    it('fails a logout the Registry rejects', async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500, statusText: 'Internal Server Error' }));

        await expect(authProvider.logout({})).rejects.toThrow('Internal Server Error');
    });

    it('drops the user info cookie on logout', async () => {
        signIn({ identifier: 'root', role: 'admin' });

        await authProvider.logout({});

        expect(Cookies.get('ilcUserInfo')).toBeUndefined();
        expect(fetch).toHaveBeenCalledWith('/auth/logout');
    });
});
