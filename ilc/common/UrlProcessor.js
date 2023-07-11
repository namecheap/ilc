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
        const doesUrlPathnameEndWithTrailingSlash = parsedUrl.pathname[parsedUrl.pathname.length - 1] === '/';

        switch (this.#trailingSlash) {
            case UrlProcessor.routerHasTo.redirectToNonTrailingSlash: {
                if (doesUrlPathnameEndWithTrailingSlash) {
                    parsedUrl.pathname = parsedUrl.pathname.slice(0, -1);
                    break;
                } else {
                    return url;
                }
            }
            case UrlProcessor.routerHasTo.redirectToTrailingSlash: {
                if (!doesUrlPathnameEndWithTrailingSlash) {
                    parsedUrl.pathname = parsedUrl.pathname.concat('/');
                    break;
                } else {
                    return url;
                }
            }
        }
        return parsedUrl.toString().replace(this.#fakeBaseInCasesWhereUrlIsRelative, '');
    };
}

module.exports = UrlProcessor;
