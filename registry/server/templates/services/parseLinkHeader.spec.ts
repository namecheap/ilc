import { expect } from 'chai';
import parseLinkHeader from './parseLinkHeader';

describe('parseLinkHeader', () => {
    it('should correctly parse empty string', () => {
        const parsedLink = parseLinkHeader('');

        expect(parsedLink).to.deep.equal([]);
    });

    it('should correctly parse link', () => {
        const parsedLink = parseLinkHeader('<http://example.com/static/main.js>; rel="fragment-script";');
        expect(parsedLink).to.deep.equal([
            {
                params: {},
                rel: 'fragment-script',
                uri: 'http://example.com/static/main.js',
            },
        ]);
    });

    it('should correctly parse link with space in attribute', () => {
        const parsedLink = parseLinkHeader('<http://example.com/static/main.js>; rel="fragment script"');

        expect(parsedLink).to.deep.equal([
            {
                params: {},
                rel: 'fragment script',
                uri: 'http://example.com/static/main.js',
            },
        ]);
    });

    it('should correctly parse link with multiple arguments', () => {
        const parsedLink = parseLinkHeader(
            'https://example.com/static/main.js; rel=script; crossorigin=anonymous,https://example.com/static/main.css;rel=stylesheet;priority=4000',
        );

        expect(parsedLink).to.deep.equal([
            {
                params: {
                    crossorigin: 'anonymous',
                },
                rel: 'script',
                uri: 'https://example.com/static/main.js',
            },
            {
                params: {
                    priority: '4000',
                },
                rel: 'stylesheet',
                uri: 'https://example.com/static/main.css',
            },
        ]);
    });

    it('should skip absent rel attribute', () => {
        const parsedLink = parseLinkHeader(
            'https://example.com/static/main.js; crossorigin=anonymous,https://example.com/static/main.css;rel=stylesheet;priority=4000',
        );

        expect(parsedLink).to.deep.equal([
            {
                params: {
                    priority: '4000',
                },
                rel: 'stylesheet',
                uri: 'https://example.com/static/main.css',
            },
        ]);
    });

    it('should not parse link query params', () => {
        const parsedLink = parseLinkHeader(
            '<https://api.github.com/user/9287/repos?page=3&per_page=100>; rel="next", ' +
                '<https://api.github.com/user/9287/repos?page=1&per_page=100>; rel="prev", ' +
                '<https://api.github.com/user/9287/repos?page=5&per_page=100>; rel="last"',
        );

        expect(parsedLink).to.deep.equal([
            {
                uri: 'https://api.github.com/user/9287/repos?page=3&per_page=100',
                rel: 'next',
                params: {},
            },
            {
                uri: 'https://api.github.com/user/9287/repos?page=1&per_page=100',
                rel: 'prev',
                params: {},
            },
            {
                uri: 'https://api.github.com/user/9287/repos?page=5&per_page=100',
                rel: 'last',
                params: {},
            },
        ]);
    });
});
