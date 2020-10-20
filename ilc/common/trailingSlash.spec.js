import chai from 'chai';
import processUrl, {routerHasTo} from './trailingSlash';

describe('trailingSlash', () => {
    const url = 'http://original.url.spec';
    const urlWithTrailingSlashAtTheEnd = url.concat('/');

    it('should return an original provided URL if a criteria is not matched', () => {
        const trailingSlash = 'something';

        chai.expect(processUrl(trailingSlash, url)).to.be.equal(url);
    });

    it('should return an original provided URL if a router should not do anything', () => {
        const trailingSlash = routerHasTo.doNothing;

        chai.expect(processUrl(trailingSlash, url)).to.be.equal(url);
    });

    describe('when a router should redirect to a base URL', () => {
        const trailingSlash = routerHasTo.redirectToBaseUrl;

        it('should return an provided URL if it is without trailing slash at the end', () => {
            chai.expect(processUrl(trailingSlash, url)).to.be.equal(url);
        });

        it('should return an URL without trailing slash at the end', () => {
            chai.expect(processUrl(trailingSlash, urlWithTrailingSlashAtTheEnd)).to.be.equal(url);
        });
    });

    describe('when a router should redirect to an URL with trailing slash', () => {
        const trailingSlash = routerHasTo.redirectToBaseUrlWithTrailingSlash;

        it('should return an provided URL if it is with trailing slash at the end', () => {
            chai.expect(processUrl(trailingSlash, urlWithTrailingSlashAtTheEnd)).to.be.equal(urlWithTrailingSlashAtTheEnd);
        });

        it('should return an URL with trailing slash at the end', () => {
            chai.expect(processUrl(trailingSlash, url)).to.be.equal(urlWithTrailingSlashAtTheEnd);
        });
    });
});
