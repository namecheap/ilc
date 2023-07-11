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
            chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.doNothing).process(urlWithoutOrigin)).to.be.equal(
                urlWithoutOrigin,
            );
        });

        it('when the original provided URL has a query', () => {
            chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.doNothing).process(urlWithQuery)).to.be.equal(
                urlWithQuery,
            );
        });

        it('when the original provided URL has a hash', () => {
            chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.doNothing).process(urlWithHash)).to.be.equal(
                urlWithHash,
            );
        });

        it('when the original provided URL has a hash and a query', () => {
            chai.expect(new UrlProcessor(UrlProcessor.routerHasTo.doNothing).process(urlWithQueryAndHash)).to.be.equal(
                urlWithQueryAndHash,
            );
        });
    });

    describe('when a router should redirect to a base URL', () => {
        describe('should return an provided URL if it is without trailing slash at the end', () => {
            it('when the original provided URL does not have origin', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToNonTrailingSlash).process(urlWithoutOrigin),
                ).to.be.equal(urlWithoutOrigin);
            });

            it('when the original provided URL has a query', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToNonTrailingSlash).process(urlWithQuery),
                ).to.be.equal(urlWithQuery);
            });

            it('when the original provided URL has a hash', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToNonTrailingSlash).process(urlWithHash),
                ).to.be.equal(urlWithHash);
            });

            it('when the original provided URL has a hash and a query', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToNonTrailingSlash).process(urlWithQueryAndHash),
                ).to.be.equal(urlWithQueryAndHash);
            });
        });

        describe('should return an URL without trailing slash at the end', () => {
            it('when the original provided URL does not have origin', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToNonTrailingSlash).process(
                        urlWithoutOriginWithTrailingSlashAtTheEnd,
                    ),
                ).to.be.equal(urlWithoutOrigin);
            });

            it('when the original provided URL has a query', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToNonTrailingSlash).process(
                        urlWithQueryAndTrailingSlashAtTheEnd,
                    ),
                ).to.be.equal(urlWithQuery);
            });

            it('when the original provided URL has a hash', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToNonTrailingSlash).process(
                        urlWithHashAndTrailingSlashAtTheEnd,
                    ),
                ).to.be.equal(urlWithHash);
            });

            it('when the original provided URL has a hash and a query', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToNonTrailingSlash).process(
                        urlWithQueryAndHashAndTrailingSlashAtTheEnd,
                    ),
                ).to.be.equal(urlWithQueryAndHash);
            });
        });
    });

    describe('when a router should redirect to an URL with trailing slash', () => {
        describe('should return an provided URL if it is with trailing slash at the end', () => {
            it('when the path starts from double slash, which is an absolute URL for URL class', () => {
                const expected = '/google.com/%2f/';
                const variants = ['\\//google.com/%2f', '//google.com/%2f', '///google.com/%2f', '/////google.com/%2f'];
                const urlProcessor = new UrlProcessor(UrlProcessor.routerHasTo.redirectToTrailingSlash);

                variants.forEach((input) => {
                    chai.expect(urlProcessor.process(input)).to.be.equal(expected, `failed for ${input}`);
                });
            });

            it('when the original provided URL does not have origin', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToTrailingSlash).process(
                        urlWithoutOriginWithTrailingSlashAtTheEnd,
                    ),
                ).to.be.equal(urlWithoutOriginWithTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a query', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToTrailingSlash).process(
                        urlWithQueryAndTrailingSlashAtTheEnd,
                    ),
                ).to.be.equal(urlWithQueryAndTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a hash', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToTrailingSlash).process(
                        urlWithHashAndTrailingSlashAtTheEnd,
                    ),
                ).to.be.equal(urlWithHashAndTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a hash and a query', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToTrailingSlash).process(
                        urlWithQueryAndHashAndTrailingSlashAtTheEnd,
                    ),
                ).to.be.equal(urlWithQueryAndHashAndTrailingSlashAtTheEnd);
            });
        });

        describe('should return an URL with trailing slash at the end', () => {
            it('when the original provided URL does not have origin', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToTrailingSlash).process(urlWithoutOrigin),
                ).to.be.equal(urlWithoutOriginWithTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a query', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToTrailingSlash).process(urlWithQuery),
                ).to.be.equal(urlWithQueryAndTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a hash', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToTrailingSlash).process(urlWithHash),
                ).to.be.equal(urlWithHashAndTrailingSlashAtTheEnd);
            });

            it('when the original provided URL has a hash and a query', () => {
                chai.expect(
                    new UrlProcessor(UrlProcessor.routerHasTo.redirectToTrailingSlash).process(urlWithQueryAndHash),
                ).to.be.equal(urlWithQueryAndHashAndTrailingSlashAtTheEnd);
            });
        });
    });
});
