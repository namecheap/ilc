import assert from 'node:assert';
import { expect } from 'chai';
import sinon from 'sinon';
import LZUTF8 from 'lzutf8';
import type { OverrideConfig } from './merge-configs';
import { parseOverrideConfig } from './parse-override-config';

function getApp(config: OverrideConfig | null, appName: string) {
    const app = config?.apps?.[appName];
    assert(app, `${appName} is missing in the override config`);
    return app;
}

function assignIgnoreInvalidSsl(ssr: Record<string, unknown>, protocol = 'http:') {
    return protocol === 'https:' ? Object.assign({}, ssr, { ignoreInvalidSsl: true }) : ssr;
}

function getExampleObject(ip = '10.1.150.223', protocol = 'http:') {
    return {
        apps: {
            '@portal/one': {
                spaBundle: `${protocol}//${ip}:2273/api/fragment/uilandingpages/app.js`,
                ssr: assignIgnoreInvalidSsl(
                    {
                        src: `${protocol}//${ip}/api/fragment/uilandingpages/`,
                    },
                    protocol,
                ),
            },
            '@portal/two': {
                spaBundle: `${protocol}//${ip}:2222/example.js`,
                ssr: assignIgnoreInvalidSsl(
                    {
                        src: `${protocol}//${ip}/`,
                        timeout: 1000,
                    },
                    protocol,
                ),
                kind: 'primary',
            },
            '@portal/three': {
                spaBundle: `${protocol}//${ip}:3333/example.js`,
                ssr: {
                    timeout: 1000,
                },
                kind: 'primary',
            },
            '@portal/four': {
                spaBundle: `${protocol}//${ip}:4444/example.js`,
                kind: 'primary',
            },
        },
        routes: [
            {
                routeId: 104,
                route: '/domains/',
                next: false,
                slots: {
                    body: {
                        appName: '@portal/two',
                        kind: null,
                    },
                },
            },
        ],
        sharedLibs: {
            sharedLibrary: {
                spaBundle: `${protocol}//${ip}:5555/bundle.js`,
            },
        },
    };
}

function getSanitizedObject() {
    return {
        apps: {
            '@portal/one': {
                ssr: {},
            },
            '@portal/two': {
                ssr: {
                    timeout: 1000,
                },
                kind: 'primary',
            },
            '@portal/three': {
                ssr: {
                    timeout: 1000,
                },
                kind: 'primary',
            },
            '@portal/four': {
                kind: 'primary',
            },
        },
        routes: [
            {
                routeId: 104,
                route: '/domains/',
                next: false,
                slots: {
                    body: {
                        appName: '@portal/two',
                        kind: null,
                    },
                },
            },
        ],
        sharedLibs: {
            sharedLibrary: {},
        },
    };
}

function getExampleCookies(ip = '10.1.150.223', protocol = 'http:', useCompression = false) {
    const value = JSON.stringify({
        apps: {
            '@portal/one': {
                spaBundle: `${protocol}//${ip}:2273/api/fragment/uilandingpages/app.js`,
                ssr: {
                    src: `${protocol}//${ip}/api/fragment/uilandingpages/`,
                },
            },
            '@portal/two': {
                spaBundle: `${protocol}//${ip}:2222/example.js`,
                ssr: {
                    src: `${protocol}//${ip}/`,
                    timeout: 1000,
                },
                kind: 'primary',
            },
            '@portal/three': {
                spaBundle: `${protocol}//${ip}:3333/example.js`,
                ssr: {
                    timeout: 1000,
                },
                kind: 'primary',
            },
            '@portal/four': {
                spaBundle: `${protocol}//${ip}:4444/example.js`,
                kind: 'primary',
            },
        },
        routes: [
            {
                routeId: 104,
                route: '/domains/',
                next: false,
                slots: {
                    body: {
                        appName: '@portal/two',
                        kind: null,
                    },
                },
            },
        ],
        sharedLibs: {
            sharedLibrary: {
                spaBundle: `${protocol}//${ip}:5555/bundle.js`,
            },
        },
    });

    let encodedValue;
    if (useCompression) {
        encodedValue = 'LZUTF8:' + LZUTF8.encodeBase64(LZUTF8.compress(value));
    } else {
        encodedValue = encodeURIComponent(value);
    }

    return `foo=bar; ILC-overrideConfig=${encodedValue}; foo2=bar2`;
}

describe('overrideConfig', () => {
    describe('return null', () => {
        it('should return null if type non string', async () => {
            const incorrectExamples = [{}, [], 123, null, undefined];

            incorrectExamples.forEach((incorrectExample) => {
                expect(parseOverrideConfig(incorrectExample)).to.equal(null);
            });
        });

        it("should return null if string doesn't contain cookie name", async () => {
            const incorrectExample = '123';

            expect(parseOverrideConfig(incorrectExample)).to.equal(null);
        });

        it("should return null if cookie can't be parsed with JSON", async () => {
            const incorrectExample = getExampleCookies().replace('overrideConfig=', 'overrideConfig=123');

            expect(parseOverrideConfig(incorrectExample)).to.equal(null);
        });
    });

    describe('ignoring invalid SSL certificates while SSR', () => {
        it('should add ignoring invalid SSL certificates when an app SSR source has HTTPS protocol', async () => {
            const exampleCookies = getExampleCookies('10.1.150.223', 'https:');
            const config = parseOverrideConfig(exampleCookies);

            expect(getApp(config, '@portal/one').ssr?.ignoreInvalidSsl).to.be.true;
            expect(getApp(config, '@portal/two').ssr?.ignoreInvalidSsl).to.be.true;
            expect(getApp(config, '@portal/three').ssr?.ignoreInvalidSsl).to.be.undefined;
            expect(getApp(config, '@portal/four').ssr).to.be.undefined;
        });

        it('should not add ignoring invalid SSL certificates when an app SSR source has HTTP protocol', async () => {
            const exampleCookies = getExampleCookies('10.1.150.223', 'http:');
            const config = parseOverrideConfig(exampleCookies);

            expect(getApp(config, '@portal/one').ssr?.ignoreInvalidSsl).to.be.undefined;
            expect(getApp(config, '@portal/two').ssr?.ignoreInvalidSsl).to.be.undefined;
            expect(getApp(config, '@portal/three').ssr?.ignoreInvalidSsl).to.be.undefined;
            expect(getApp(config, '@portal/four').ssr).to.be.undefined;
        });

        it('should not add ignoring invalid SSL certificates when an app SSR source has no protocol', async () => {
            const exampleCookies = getExampleCookies('10.1.150.223', '');
            const config = parseOverrideConfig(exampleCookies);

            expect(getApp(config, '@portal/one').ssr?.ignoreInvalidSsl).to.be.undefined;
            expect(getApp(config, '@portal/two').ssr?.ignoreInvalidSsl).to.be.undefined;
            expect(getApp(config, '@portal/three').ssr?.ignoreInvalidSsl).to.be.undefined;
            expect(getApp(config, '@portal/four').ssr).to.be.undefined;
        });
    });

    describe('not sanitized', () => {
        it('should not sanitize valid private ip with http', async () => {
            const exampleCookies = getExampleCookies('10.1.150.223', 'http:');

            expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject('10.1.150.223', 'http:'));
        });

        it('should not sanitize valid private ip with https', async () => {
            const exampleCookies = getExampleCookies('10.1.150.223', 'https:');

            expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject('10.1.150.223', 'https:'));
        });

        it('should not sanitize correct config for 127.0.0.1', async () => {
            const ip = '127.0.0.1';
            const exampleCookies = getExampleCookies(ip);

            expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
        });

        it('should not sanitize correct config for any 127.x.x.x', async () => {
            for (let i = 0; i < 256; i++) {
                const ip = `127.${i}.${i}.${i}`;
                const exampleCookies = getExampleCookies(ip);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
            }
        });

        it('should not sanitize correct config for localhost', async () => {
            const ip = `localhost`;
            const exampleCookies = getExampleCookies(ip);
            expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
        });

        it('should not sanitize correct config for any 10.x.x.x', async () => {
            for (let i = 0; i < 256; i++) {
                const ip = `10.${i}.${i}.${i}`;
                const exampleCookies = getExampleCookies(ip);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
            }
        });

        it('should not sanitize correct config for any 192.168.x.x', async () => {
            for (let i = 0; i < 256; i++) {
                const ip = `192.168.${i}.${i}`;
                const exampleCookies = getExampleCookies(ip);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
            }
        });

        it('should not sanitize correct config for any 172.16.0.0 - 172.31.255.255', async () => {
            for (let i = 16; i < 32; i++) {
                for (let j = 0; j < 256; j++) {
                    const ip = `172.${i}.${j}.${j}`;
                    const exampleCookies = getExampleCookies(ip);
                    expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
                }
            }
        });

        it('should work with lzutf8 cookie', () => {
            const exampleCookies = getExampleCookies('10.1.150.223', 'http:', true);

            expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject('10.1.150.223', 'http:'));
        });
    });

    describe('sanitized', () => {
        it('should sanitize domain names', async () => {
            const ip = 'foo.com';
            const exampleCookies = getExampleCookies(ip);
            const logger = {
                warn: sinon.spy(),
            };

            expect(parseOverrideConfig(exampleCookies, undefined, logger)).deep.equal(getSanitizedObject());
            expect(logger.warn.called).to.be.true;
        });

        it('should sanitize url w/ spaces', async () => {
            const ip = 'foo.com';
            const exampleCookies = getExampleCookies(ip, '   http:');

            expect(parseOverrideConfig(exampleCookies)).deep.equal(getSanitizedObject());
        });

        it('should sanitize url w/o protocol', async () => {
            const ip = 'foo.com';
            const exampleCookies = getExampleCookies(ip, '');

            expect(parseOverrideConfig(exampleCookies)).deep.equal(getSanitizedObject());
        });

        it('should sanitize non 10/127.x.x.x', async () => {
            for (let i = 0; i < 256; i++) {
                const ip = `${i}.${i}.${i}.${i}`;
                const exampleCookies = getExampleCookies(ip);
                if (i !== 10 && i !== 127) {
                    expect(parseOverrideConfig(exampleCookies)).deep.equal(getSanitizedObject());
                }
            }
        });

        it('should sanitize 192.x.x.x and x.168.x.x', async () => {
            const incorrectIps = ['192.1.1.1', '1.168.1.1'];

            incorrectIps.forEach((incorrectIp) => {
                let exampleCookies = getExampleCookies(incorrectIp);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getSanitizedObject());
            });
        });

        it('should sanitize non 172.16.0.0 - 172.31.255.255', async () => {
            const incorrectIps = ['172.15.0.0', '172.32.255.255', '171.16.0.0', '173.31.255.255'];

            incorrectIps.forEach((incorrectIp) => {
                let exampleCookies = getExampleCookies(incorrectIp);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getSanitizedObject());
            });
        });
    });

    describe('trust all origins', () => {
        it('should not sanitize domain names', async () => {
            const ip = 'foo.com';
            const exampleCookies = getExampleCookies(ip);
            const expectedResult = getExampleObject(ip);

            expect(parseOverrideConfig(exampleCookies, 'all')).deep.equal(expectedResult);
        });

        it('should not sanitize url w/o protocol', async () => {
            const ip = 'foo.com';
            const exampleCookies = getExampleCookies(ip, '');
            const expectedResult = getExampleObject(ip, '');

            expect(parseOverrideConfig(exampleCookies, 'all')).deep.equal(expectedResult);
        });

        it('should not sanitize any ip', async () => {
            const incorrectIps = [
                '172.15.0.0',
                '172.32.255.255',
                '171.16.0.0',
                '173.31.255.255',
                '192.1.1.1',
                '1.168.1.1',
            ];

            incorrectIps.forEach((incorrectIp) => {
                const exampleCookies = getExampleCookies(incorrectIp);
                const expectedResult = getExampleObject(incorrectIp);
                expect(parseOverrideConfig(exampleCookies, 'all')).deep.equal(expectedResult);
            });
        });
    });

    describe('trust certain origins', () => {
        it('should not sanitize trusted origins', async () => {
            const trustedExamples = ['foo.com', 'bar.com', '1.1.1.1'];

            trustedExamples.forEach((ip) => {
                const exampleCookies = getExampleCookies(ip);
                const expectedResult = getExampleObject(ip);
                expect(parseOverrideConfig(exampleCookies, trustedExamples.toString())).deep.equal(expectedResult);
            });
        });

        it('should not sanitize trusted url w/o protocol', async () => {
            const trustedExamples = ['foo.com', 'bar.com', '1.1.1.1'];

            trustedExamples.forEach((ip) => {
                const exampleCookies = getExampleCookies(ip, '');
                const expectedResult = getExampleObject(ip, '');
                expect(parseOverrideConfig(exampleCookies, trustedExamples.toString())).deep.equal(expectedResult);
            });
        });

        it('should sanitize non trusted origins', async () => {
            const trustedExamples = ['foo.com', 'bar.com', '1.1.1.1'];
            const nonTrustedExamples = ['incorrect.com', '2.2.2.2'];

            nonTrustedExamples.forEach((ip) => {
                const exampleCookies = getExampleCookies(ip);
                const expectedResult = getSanitizedObject();
                expect(parseOverrideConfig(exampleCookies, trustedExamples.toString())).deep.equal(expectedResult);
            });
        });

        it('should not sanitize trusted url w/ subdomain', async () => {
            const domain = 'bar.foo.com';
            const trustedExamples = ['*.foo.com'];

            const exampleCookies = getExampleCookies(domain, '');
            const expectedResult = getExampleObject(domain, '');
            expect(parseOverrideConfig(exampleCookies, trustedExamples.toString())).deep.equal(expectedResult);
        });

        it('should not sanitize trusted url w/ subdomain of 3-rd and 4-th level', async () => {
            const domain = 'baz.bar.foo.com';
            const trustedExamples = ['*.*.foo.com'];

            const exampleCookies = getExampleCookies(domain, '');
            const expectedResult = getExampleObject(domain, '');
            expect(parseOverrideConfig(exampleCookies, trustedExamples.toString())).deep.equal(expectedResult);
        });
    });

    describe('trusted origin matching', () => {
        const trustedOrigins =
            '*.tunnel.example.io, example-cdn.com, *.example.com, *.example.org, example.net, *.example.dev';

        function parseSpaBundle(spaBundle: string, origins = trustedOrigins) {
            const cookie = `ILC-overrideConfig=${encodeURIComponent(
                JSON.stringify({ apps: { '@portal/one': { spaBundle } } }),
            )}`;

            return getApp(parseOverrideConfig(cookie, origins), '@portal/one').spaBundle;
        }

        it('should keep links to trusted origins', () => {
            const links = [
                'https://example-cdn.com/x.js',
                'https://example-cdn.com:8443/x.js',
                'HTTPS://EXAMPLE-CDN.COM/x.js',
                'https://Example-CDN.com/x.js',
                'https://example-cdn.com./x.js',
                '//example-cdn.com/x.js',
                'https://www.example.com/x.js',
                'https://a.b.example.com/x.js',
                'https://www.example.com./x.js',
                'https://foo.tunnel.example.io/x.js',
                'http://localhost:8080/x.js',
                '/relative/x.js',
                'relative/x.js',
            ];

            links.forEach((link) => expect(parseSpaBundle(link), link).to.equal(link));
        });

        it('should sanitize hosts which only start with a trusted origin', () => {
            const links = [
                'https://example-cdn.com.attacker.example/x.js',
                'https://example-cdn.comattacker.example/x.js',
                'https://EXAMPLE-CDN.COM.attacker.example/x.js',
                'https://example-cdn.com.attacker.example./x.js',
                'https://x.example.com.attacker.example/x.js',
                'https://example.net.attacker.example/x.js',
                'https://localhost.attacker.example/x.js',
            ];

            links.forEach((link) => expect(parseSpaBundle(link), link).to.be.undefined);
        });

        it('should sanitize hosts which only end with a trusted origin', () => {
            const links = [
                'https://attacker-example-cdn.com/x.js',
                'https://attacker.example-cdn.com/x.js',
                'https://attackerexample.com/x.js',
            ];

            links.forEach((link) => expect(parseSpaBundle(link), link).to.be.undefined);
        });

        it('should not match the base domain of a wildcard origin', () => {
            expect(parseSpaBundle('https://example.com/x.js')).to.be.undefined;
        });

        it('should sanitize links with a trusted origin in userinfo', () => {
            const links = [
                'https://example-cdn.com@attacker.example/x.js',
                'https://example-cdn.com:443@attacker.example/x.js',
                'https://www.example.com:x@attacker.example/x.js',
                '//example-cdn.com@attacker.example/x.js',
            ];

            links.forEach((link) => expect(parseSpaBundle(link), link).to.be.undefined);
        });

        it('should sanitize links which the browser resolves to an untrusted host', () => {
            const links = [
                'https:\\\\attacker.example\\x.js',
                'https:attacker.example/x.js',
                'http:attacker.example/x.js',
                '/\\attacker.example/x.js',
                '\\\\attacker.example/x.js',
                'ht\ttps://attacker.example/x.js',
                '//attacker.example/x.js',
            ];

            links.forEach((link) => expect(parseSpaBundle(link), link).to.be.undefined);
        });

        it('should sanitize links which can be executed without a network host', () => {
            const links = ['data:text/javascript,alert(1)', 'javascript:alert(1)', 'blob:https://attacker.example/1'];

            links.forEach((link) => expect(parseSpaBundle(link), link).to.be.undefined);
        });

        it('should sanitize public hosts which contain a private ip', () => {
            const links = [
                'https://attacker.example/10.0.0.1/x.js',
                'https://attacker.example/x.js?10.0.0.1',
                'https://10.0.0.1.attacker.example/x.js',
                'https://10.0.0.1@attacker.example/x.js',
            ];

            links.forEach((link) => expect(parseSpaBundle(link, ''), link).to.be.undefined);
        });

        it('should respect a port of a trusted origin', () => {
            expect(parseSpaBundle('https://foo.com:8443/x.js', 'foo.com:8443')).to.equal('https://foo.com:8443/x.js');
            expect(parseSpaBundle('https://foo.com/x.js', 'foo.com:443')).to.equal('https://foo.com/x.js');
            expect(parseSpaBundle('https://foo.com/x.js', 'foo.com:8443')).to.be.undefined;
            expect(parseSpaBundle('https://foo.com:9443/x.js', 'foo.com:8443')).to.be.undefined;
        });

        it('should match a trusted port against the default port of the link scheme', () => {
            const trustedLinks: [string, string][] = [
                ['http://foo.com/x.js', 'foo.com:80'],
                ['http://foo.com:80/x.js', 'foo.com:80'],
                ['https://foo.com:443/x.js', 'foo.com:443'],
                ['http://foo.com:443/x.js', 'foo.com:443'],
                ['https://foo.com/x.js', 'foo.com:0443'],
            ];
            const untrustedLinks: [string, string][] = [
                ['http://foo.com/x.js', 'foo.com:443'],
                ['https://foo.com/x.js', 'foo.com:80'],
                ['https://foo.com:80/x.js', 'foo.com:443'],
                ['https://foo.com/x.js', 'foo.com:99999'],
            ];

            trustedLinks.forEach(([link, origin]) => expect(parseSpaBundle(link, origin), link).to.equal(link));
            untrustedLinks.forEach(([link, origin]) => expect(parseSpaBundle(link, origin), link).to.be.undefined);
        });

        it('should ignore malformed trusted origins', () => {
            const origins = ['*', '*.*', 'foo.*.com', 'https://foo.com', 'foo.com/x', 'foo.com@bar.com'];

            origins.forEach((origin) => expect(parseSpaBundle('https://foo.com/x.js', origin), origin).to.be.undefined);
        });

        it('should sanitize untrusted links in arrays', () => {
            const cookie = `ILC-overrideConfig=${encodeURIComponent(
                JSON.stringify({
                    apps: {
                        '@portal/one': {
                            props: { links: ['https://attacker.example/x.js', 'https://example-cdn.com/x.js'] },
                        },
                    },
                }),
            )}`;

            const links = getApp(parseOverrideConfig(cookie, trustedOrigins), '@portal/one').props?.links;

            expect(links[0]).to.be.undefined;
            expect(links[1]).to.equal('https://example-cdn.com/x.js');
        });

        it('should keep plain strings', () => {
            ['primary', 'Note: not a link', 'mailto:support@example.com', '@portal/one'].forEach((value) =>
                expect(parseSpaBundle(value), value).to.equal(value),
            );
        });
    });
});
