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
                return response.json();
            })
            .then((userInfo) => {
                localStorage.setItem('ilc:userInfo', JSON.stringify(userInfo));
            });
    },
    logout: () => {
        return fetch('/logout')
            .then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(response.statusText);
                }
                localStorage.removeItem('ilc:userInfo');
            });
    },
    checkError: ({ status }) => {
        return status === 401 || status === 403
            ? Promise.reject()
            : Promise.resolve();
    },
    checkAuth: () => {
        return localStorage.getItem('ilc:userInfo')
            ? Promise.resolve()
            : Promise.reject();
    },
    getPermissions: () => {
        const userInfo = localStorage.getItem('ilc:userInfo');
        return userInfo ? Promise.resolve(JSON.parse(userInfo).role) : Promise.reject();
    },
};
