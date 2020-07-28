import Cookies from 'js-cookie';

// Authenticatd by default
export default {
    login: ({ username, password }) => {
        const request = new Request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
        return fetch(request)
            .then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(response.statusText);
                }
            });
    },
    logout: () => {
        Cookies.remove('ilc:userInfo');
        return fetch('/logout')
            .then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(response.statusText);
                }
            });
    },
    checkError: ({ status }) => {
        return status === 401 || status === 403
            ? Promise.reject()
            : Promise.resolve();
    },
    checkAuth: () => {
        return Cookies.get('ilc:userInfo')
            ? Promise.resolve()
            : Promise.reject();
    },
    getPermissions: () => {
        const userInfo = Cookies.getJSON('ilc:userInfo');
        return userInfo ? Promise.resolve(userInfo.role) : Promise.reject();
    },
};
