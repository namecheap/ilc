import Cookies from 'js-cookie';
import type { AuthProvider } from 'react-admin';

interface UserInfo {
    identifier: string;
    role: string;
}

function getUserInfo(): UserInfo | undefined {
    try {
        return JSON.parse(Cookies.get('ilcUserInfo') ?? '');
    } catch {
        return undefined;
    }
}

/** The query of the current hash route, `#/login?returnTo=...` */
function getHashQuery() {
    const hash = window.location.hash;
    const start = hash.indexOf('?');
    return new URLSearchParams(start === -1 ? '' : hash.slice(start + 1));
}

/**
 * Only a path on this origin is followed after the login, so the query cannot send the user elsewhere. Resolving
 * the value against the origin catches every spelling of an external URL, backslashes and scheme included.
 */
function isSameOriginPath(path: string | null): path is string {
    if (typeof path !== 'string' || !path.startsWith('/')) {
        return false;
    }
    try {
        return new URL(path, window.location.origin).origin === window.location.origin;
    } catch {
        return false;
    }
}

const READ_ACTIONS = ['list', 'show'];

// The session lives in an httpOnly cookie of the Registry, the readable "ilcUserInfo" cookie tells who owns it
export const authProvider: AuthProvider = {
    async login({ username, password }) {
        const response = await fetch('/auth/local', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
        if (response.status < 200 || response.status >= 300) {
            throw new Error(response.statusText);
        }

        // A server route, such as /oauth/authorize continuing a pending OAuth request, needs a full navigation;
        // the promise stays pending so react-admin does not route away while the browser leaves the page
        const returnTo = getHashQuery().get('returnTo');
        if (isSameOriginPath(returnTo)) {
            window.location.assign(returnTo);
            return new Promise(() => {});
        }

        return undefined;
    },
    async logout() {
        Cookies.remove('ilcUserInfo');
        const response = await fetch('/auth/logout');
        if (response.status < 200 || response.status >= 300) {
            throw new Error(response.statusText);
        }
    },
    // Rejections carry no error, so react-admin shows its own "session ended" and "please login" messages
    checkError({ status }: { status?: number }) {
        return status === 401 ? Promise.reject() : Promise.resolve();
    },
    checkAuth() {
        return Cookies.get('ilcUserInfo') ? Promise.resolve() : Promise.reject();
    },
    async getPermissions() {
        // null for an anonymous user, who only gets to the login page
        return getUserInfo()?.role ?? null;
    },
    // A read-only user gets no action that changes data, so react-admin hides the buttons and bulk actions for them
    async canAccess({ action }) {
        return getUserInfo()?.role !== 'readonly' || READ_ACTIONS.includes(action);
    },
    async getIdentity() {
        const userInfo = getUserInfo();
        if (!userInfo) {
            throw new Error('Unauthorized');
        }

        return { id: userInfo.identifier, fullName: `${userInfo.identifier} ("${userInfo.role}" access)` };
    },
};
