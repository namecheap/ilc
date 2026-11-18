import Cookies from 'js-cookie';

function getUserInfo() {
    try {
        return JSON.parse(Cookies.get('ilcUserInfo'));
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
function isSameOriginPath(path) {
    if (typeof path !== 'string' || !path.startsWith('/')) {
        return false;
    }
    try {
        return new URL(path, window.location.origin).origin === window.location.origin;
    } catch {
        return false;
    }
}

// Authenticatd by default
export default {
    login: ({ username, password }) => {
        const request = new Request('/auth/local', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
        return fetch(request).then((response) => {
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
        });
    },
    logout: () => {
        Cookies.remove('ilcUserInfo');
        return fetch('/auth/logout').then((response) => {
            if (response.status < 200 || response.status >= 300) {
                throw new Error(response.statusText);
            }
        });
    },
    checkError: ({ status }) => {
        return status === 401 ? Promise.reject() : Promise.resolve();
    },
    checkAuth: () => {
        return Cookies.get('ilcUserInfo') ? Promise.resolve() : Promise.reject();
    },
    getPermissions: () => {
        const userInfo = getUserInfo();

        return userInfo ? Promise.resolve(userInfo.role) : Promise.reject();
    },
    getIdentity: () => {
        const userInfo = getUserInfo();

        return { id: userInfo.identifier, fullName: `${userInfo.identifier} ("${userInfo.role}" access)` };
    },
};
