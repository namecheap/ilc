export default class Page500 {
    constructor({
        wrapFetchWithCache,
    }) {
        this.getTemplate = wrapFetchWithCache(this.#getTemplate, {
            cacheForSeconds: 3600,
        });
    }

    #getTemplate = async () => {
        console.log('Calling 500 error page endpoint...');

        const res = await fetch('/_ilc/api/v1/page/500');

        if (!res.ok) {
            return Promise.reject(new Error(`Error while trying to fetch 500 error page template with status code ${res.status}`));
        }

        return res.text();
    }
};
