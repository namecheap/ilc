class UrlProcessor {
    static routerHasTo = {
        doNothing: 'doNothing',
        redirectToBaseUrl: 'redirectToBaseUrl',
        redirectToBaseUrlWithTrailingSlash: 'redirectToBaseUrlWithTrailingSlash',
    };

    #fakeBaseInCasesWhereUrlIsRelative = 'http://hack';
    #trailingSlash;

    constructor(trailingSlash) {
        this.#trailingSlash = trailingSlash;
    }

    process(url) {
        switch (this.#trailingSlash) {
            case UrlProcessor.routerHasTo.redirectToBaseUrl:
            case UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash: {
                return this.#processUrlTrailingSlash(url);
            }
            case UrlProcessor.routerHasTo.doNothing:
            default: {
                return url;
            };
        }
    }

    #processUrlTrailingSlash = (url) => {
        const parsedUrl = new URL(url, this.#fakeBaseInCasesWhereUrlIsRelative);
        const doesUrlPathnameEndWithTrailingSlash = parsedUrl.pathname[parsedUrl.pathname.length - 1] === '/';

        switch (this.#trailingSlash) {
            case UrlProcessor.routerHasTo.redirectToBaseUrl: {
                if (doesUrlPathnameEndWithTrailingSlash) {
                    parsedUrl.pathname = parsedUrl.pathname.slice(0, -1);
                    break;
                } else {
                    return url;
                }
            }
            case UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash: {
                if (!doesUrlPathnameEndWithTrailingSlash) {
                    parsedUrl.pathname = parsedUrl.pathname.concat('/');
                    break;
                } else {
                    return url;
                }
            }
        }

        return parsedUrl.toString().replace(this.#fakeBaseInCasesWhereUrlIsRelative, '');
    }
}

module.exports = UrlProcessor;
