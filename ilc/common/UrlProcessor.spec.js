import chai from 'chai';
import UrlProcessor from './UrlProcessor';

describe('UrlProcessor', () => {
    const urlWithoutOrigin = '/specific/route';
    const urlWithoutOriginWithTrailingSlashAtTheEnd = urlWithoutOrigin.concat('/');

    const urlWithQuery = 'http://original.url.spec/specific/route?query=string';
    const urlWithQueryAndTrailingSlashAtTheEnd = 'http://original.url.spec/specific/route/?query=string';

    const urlWithHash = 'http://original.url.spec/specific/route#hash';
    const urlWithHashAndTrailingSlashAtTheEnd = 'http://original.url.spec/specific/route/#hash';

    const urlWithQueryAndHash = 'http://original.url.spec/specific/route?query=string#hash';
    const urlWithQueryAndHashAndTrailingSlashAtTheEnd = 'http://original.url.spec/specific/route/?query=string#hash';

    describe('should return an original provided URL if a criteria is not matched', () => {
        it('when the original provided URL does not have origin', () => {
            chai.expect(new UrlProcessor('something').process(urlWithoutOrigin)).to.be.equal(urlWithoutOrigin);
        });

        it('when the original provided URL has a query', () => {
            chai.expect(new UrlProcessor('something').process(urlWithQuery)).to.be.equal(urlWithQuery);
        });

        it('when the original provided URL has a hash', () => {
            chai.expect(new UrlProcessor('something').process(urlWithHash)).to.be.equal(urlWithHash);
        });

        it('when the original provided URL has a hash and a query', () => {
            chai.expect(new UrlProcessor('something').process(urlWithQueryAndHash)).to.be.equal(urlWithQueryAndHash);
        });
    });

    describe('should return an original provided URL if a router should not do anything', () => {
        it('when the original provided URL does not have origin', () => {
            chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.doNothing).process(urlWithoutOrigin)).to.be.equal(urlWithoutOrigin);
        });

        it('when the original provided URL has a query', () => {
            chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.doNothing).process(urlWithQuery)).to.be.equal(urlWithQuery);
        });

        it('when the original provided URL has a hash', () => {
            chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.doNothing).process(urlWithHash)).to.be.equal(urlWithHash);
        });

        it('when the original provided URL has a hash and a query', () => {
            chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.doNothing).process(urlWithQueryAndHash)).to.be.equal(urlWithQueryAndHash);
        });
    });

    describe('when a router should redirect to a base URL', () => {
        describe('should return an provided URL if it is without trailing slash at the end', () => {
            it('when the original provided URL does not have origin', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrl).process(urlWithoutOrigin)).to.be.equal(urlWithoutOrigin);
            });

            it('when the original provided URL has a query', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrl).process(urlWithQuery)).to.be.equal(urlWithQuery);
            });

            it('when the original provided URL has a hash', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrl).process(urlWithHash)).to.be.equal(urlWithHash);
            });

            it('when the original provided URL has a hash and a query', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrl).process(urlWithQueryAndHash)).to.be.equal(urlWithQueryAndHash);
            });
        });

        describe('should return an URL without trailing slash at the end', () => {
            it('when the original provided URL does not have origin', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrl).process(urlWithoutOriginWithTrailingSlashAtTheEnd)).to.be.equal(urlWithoutOrigin);
            });

            it('when the original provided URL has a query', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrl).process(urlWithQueryAndTrailingSlashAtTheEnd)).to.be.equal(urlWithQuery);
            });

            it('when the original provided URL has a hash', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrl).process(urlWithHashAndTrailingSlashAtTheEnd)).to.be.equal(urlWithHash);
            });

            it('when the original provided URL has a hash and a query', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrl).process(urlWithQueryAndHashAndTrailingSlashAtTheEnd)).to.be.equal(urlWithQueryAndHash);
            });
        });
    });

    describe('when a router should redirect to an URL with trailing slash', () => {
        describe('should return an provided URL if it is with trailing slash at the end', () => {
            it('when the original provided URL does not have origin', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash).process(urlWithoutOriginWithTrailingSlashAtTheEnd)).to.be.equal(urlWithoutOriginWithTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a query', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash).process(urlWithQueryAndTrailingSlashAtTheEnd)).to.be.equal(urlWithQueryAndTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a hash', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash).process(urlWithHashAndTrailingSlashAtTheEnd)).to.be.equal(urlWithHashAndTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a hash and a query', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash).process(urlWithQueryAndHashAndTrailingSlashAtTheEnd)).to.be.equal(urlWithQueryAndHashAndTrailingSlashAtTheEnd);
            });
        });

        describe('should return an URL with trailing slash at the end', () => {
            it('when the original provided URL does not have origin', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash).process(urlWithoutOrigin)).to.be.equal(urlWithoutOriginWithTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a query', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash).process(urlWithQuery)).to.be.equal(urlWithQueryAndTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a hash', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash).process(urlWithHash)).to.be.equal(urlWithHashAndTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a hash and a query', () => {
                chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.redirectToBaseUrlWithTrailingSlash).process(urlWithQueryAndHash)).to.be.equal(urlWithQueryAndHashAndTrailingSlashAtTheEnd);
            });
        });
    });
});
