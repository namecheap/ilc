export default class ApiPage500 {
    _cacheForSeconds;

    _endpoint = '/_ilc/page/500';
    _data = null;
    _cachedAt = 0;
    _cacheResolutionPromise = null;

    constructor(cacheForSeconds = 3600) {
        this._cacheForSeconds = cacheForSeconds;
    }

    getTemplate() {
        const now = Math.floor(Date.now() / 1000);

        if (this._data === null || this._cachedAt < now - this._cacheForSeconds) {
            if (this._cacheResolutionPromise !== null) {
                if (this._data !== null) { // It's better to return stale data rather then cause delay
                    return Promise.resolve(this._data);
                }

                return this._cacheResolutionPromise;
            }

            this._cacheResolutionPromise = this._fetchTemplate().then(template => {
                this._cacheResolutionPromise = null;
                this._cachedAt = now;
                this._data = {
                    template,
                    checkAfter: now + this._cacheForSeconds,
                };

                return this._data;
            }).catch(err => {
                this._cacheResolutionPromise = null;

                if (this._data !== null) {
                    console.error('Error refreshing 500 error page template...');
                    console.error(err);
                } else {
                    return Promise.reject(err);
                }
            });

            if (this._data !== null) { // It's better to return stale data rather then cause delay
                return Promise.resolve(this._data);
            }

            return this._cacheResolutionPromise;
        }

        return Promise.resolve(this._data);
    }

    _fetchTemplate() {
        console.log('Calling 500 error page endpoint...')

        return fetch(this._endpoint).then((res) => {
            if (!res.ok) {
                return Promise.reject(new Error('Something went wrong!'));
            }

            return res.text();
        });
    };

}
