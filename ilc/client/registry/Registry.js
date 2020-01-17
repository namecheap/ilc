export default class Registry {
    constructor(wrapWithCache) {
        this.getTemplate = wrapWithCache(this.#getTemplate, {
            cacheForSeconds: 3600,
        });
    }

    async preheat() {
        await this.getTemplate('500');
    }

    #getTemplate = async (name) => {
        const res = await fetch(`/_ilc/api/v1/registry/template/${name}`);

        if (!res.ok) {
            return Promise.reject(new Error(`Error while trying to fetch 500 error page template with status code ${res.status}`));
        }

        return res.text();
    }
};
