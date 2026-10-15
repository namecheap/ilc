import Cookies from 'js-cookie';

function getUserInfo() {
    try {
        return JSON.parse(Cookies.get('ilcUserInfo'));
    } catch {
        return undefined;
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
