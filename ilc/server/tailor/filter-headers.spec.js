const chai = require('chai');

const filterHeaders = require('./filter-headers');

describe('filter headers', () => {
    it('should not return any headers due to security reasons when a fragment is public', () => {
        const attributes = {
            public: true,
        };

        const request = {
            headers: {
                'content-type': 'text/html',
                host: 'www.somewhere.com/host',
                'accept-language': 'en-US, en;q=0.5',
            },
        };

        chai.expect(filterHeaders(attributes, request)).to.be.eql({});
    });

    it('should not return any headers when request does not have any one', () => {
        const attributes = {
            public: false,
        };

        const request = {
            headers: {},
        };

        chai.expect(filterHeaders(attributes, request)).to.be.eql({});
    });

    it('should return only accepted and x-forwarded headers', () => {
        const attributes = {
            public: false,
        };

        const request = {
            headers: {
                authorization: 'Bearer 12345',
                'content-type': 'text/html',
                host: 'www.somewhere.com/host',
                'accept-language': 'fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5',
                referer: 'www.somewhere.com/referer',
                'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
                'x-request-uri': 'www.somewhere.com/x-request-uri',
                'x-request-host': 'www.somewhere.com/x-request-host',
                cookie: 'yummy_cookie=choco; tasty_cookie=strawberry',
                'x-forwarded-cookie': 'yummy_cookie=choco; tasty_cookie=apple',
                'x-cookie': 'yummy_cookie=choco; tasty_cookie=orange',
                'cookie-x-forwarded': 'yummy_cookie=choco; tasty_cookie=banana',
                'x-cookie-forwarded': 'yummy_cookie=choco; tasty_cookie=lemon',
            },
        };

        chai.expect(filterHeaders(attributes, request)).to.be.eql({
            authorization: 'Bearer 12345',
            'accept-language': request.headers['accept-language'],
            referer: request.headers['referer'],
            'user-agent': request.headers['user-agent'],
            'x-request-uri': request.headers['x-request-uri'],
            'x-request-host': request.headers['x-request-host'],
            cookie: request.headers['cookie'],
            'x-forwarded-cookie': request.headers['x-forwarded-cookie'],
        });
    });
});
