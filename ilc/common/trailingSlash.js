const routerHasTo = {
    doNothing: 'doNothing',
    redirectToBaseUrl: 'redirectToBaseUrl',
    redirectToBaseUrlWithTrailingSlash: 'redirectToBaseUrlWithTrailingSlash',
};

const processUrl = (trailingSlash, url) => {
    const doesReqUrlEndWithTrailingSlash = url[url.length - 1] === '/';

    switch (trailingSlash) {
        case routerHasTo.doNothing: break;
        case routerHasTo.redirectToBaseUrl: {
            if (!doesReqUrlEndWithTrailingSlash) {
                break;
            }
            return url.slice(0, -1);
        }
        case routerHasTo.redirectToBaseUrlWithTrailingSlash: {
            if (doesReqUrlEndWithTrailingSlash) {
                break;
            }
            return url.concat('/');
        }
        default: break;
    }

    return url;
};

module.exports = processUrl;
module.exports.routerHasTo = routerHasTo;
