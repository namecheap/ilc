class UrlProcessor {
    static validSchemes = ['http://', 'https://'];

    static routerHasTo = {
        doNothing: 'doNothing',
        redirectToNonTrailingSlash: 'redirectToNonTrailingSlash',
        redirectToTrailingSlash: 'redirectToTrailingSlash',
    };

    #fakeBaseInCasesWhereUrlIsRelative = 'http://hack';
    #trailingSlash;

    constructor(trailingSlash) {
        this.#trailingSlash = trailingSlash;
    }

    process(url) {
        switch (this.#trailingSlash) {
            case UrlProcessor.routerHasTo.redirectToNonTrailingSlash:
            case UrlProcessor.routerHasTo.redirectToTrailingSlash: {
                return this.#processUrlTrailingSlash(url);
            }
            case UrlProcessor.routerHasTo.doNothing:
            default: {
                return url;
            }
        }
    }

    #processUrlTrailingSlash = (url) => {
        if (!UrlProcessor.validSchemes.some((scheme) => url.startsWith(scheme))) {
            // any combination of slashes at the beginning URL class classifies as an absolute link with http: protocol, so we remove them at the end
            url = url.replace(/^[\/\\]+/gi, '/');
        }

        const parsedUrl = new URL(url, this.#fakeBaseInCasesWhereUrlIsRelative);

        if (parsedUrl.username || parsedUrl.password) {
            return '/';
        }

        // Ensure there are no double slashes in the pathname, excluding the start
        parsedUrl.pathname = parsedUrl.pathname.replace(/\/{2,}/g, '/');

        const doesUrlPathnameEndWithTrailingSlash = parsedUrl.pathname[parsedUrl.pathname.length - 1] === '/';

        switch (this.#trailingSlash) {
            case UrlProcessor.routerHasTo.redirectToNonTrailingSlash: {
                if (doesUrlPathnameEndWithTrailingSlash) {
                    parsedUrl.pathname = parsedUrl.pathname.slice(0, -1);
                }
                break;
            }
            case UrlProcessor.routerHasTo.redirectToTrailingSlash: {
                if (!doesUrlPathnameEndWithTrailingSlash) {
                    parsedUrl.pathname = parsedUrl.pathname.concat('/');
                }
                break;
            }
        }

        let resultUrl = parsedUrl.toString().replace(this.#fakeBaseInCasesWhereUrlIsRelative, '');

        // Strip any trailing double slashes from the pathname, if present
        resultUrl = resultUrl.replace(/\/{2,}$/g, '/');

        return resultUrl;
    };
}

module.exports = UrlProcessor;
