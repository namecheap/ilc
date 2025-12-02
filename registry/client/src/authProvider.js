import Cookies from 'js-cookie';

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
        const userInfo = Cookies.getJSON('ilcUserInfo');

        return userInfo ? Promise.resolve(userInfo.role) : Promise.reject();
    },
    getIdentity: () => {
        const userInfo = Cookies.getJSON('ilcUserInfo');

        return { id: userInfo.identifier, fullName: `${userInfo.identifier} ("${userInfo.role}" access)` };
    },
};
