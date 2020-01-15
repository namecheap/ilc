const fetchWithCacheFactory = require('./fetchWithCache');

const getTemplate = fetchWithCacheFactory(() => {
    console.log('Calling 500 error page endpoint...');

    return fetch('/_ilc/page/500').then((res) => {
        if (!res.ok) {
            return Promise.reject(new Error('Something went wrong!'));
        }

        return res.text();
    });
}, {
    cacheForSeconds: 3600,
})

module.exports = {
    getTemplate,
};
