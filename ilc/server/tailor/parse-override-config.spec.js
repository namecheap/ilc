import { expect } from 'chai';
const parseOverrideConfig = require('./parse-override-config');

const getExampleObject = (ip = '10.1.150.223', protocol = 'http:') => (
    {
        apps: {
            '@portal/one': {
                spaBundle: `${protocol}//${ip}:2273/api/fragment/uilandingpages/app.js`,
                ssr: {
                    src: `${protocol}//${ip}:2273/api/fragment/uilandingpages/`
                }
            },
            '@portal/two': {
                spaBundle: `${protocol}//${ip}:2222/example.js`,
                ssr: {
                    src: `${protocol}//${ip}:2222/`,
                    timeout: 1000,
                },
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
    }
);

const getSanitizedObject = () => (
    {
        apps: {
            '@portal/one': {
                ssr: {}
            },
            '@portal/two': {
                ssr: {
                    timeout: 1000,
                },
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
    }
);

const getExampleCookies = (ip = '10.1.150.223', protocol = 'http:') => {
    const value = encodeURIComponent(JSON.stringify(getExampleObject(ip, protocol)));

    return `foo=bar; ILC-overrideConfig=${value}; foo2=bar2`;
};


describe('overrideConfig', () => {

    describe('return undefined', () => {
        it('should return undefined if type non string', async () => {
            const incorrectExamples = [{},[], 123, null, undefined];

            incorrectExamples.forEach(incorrectExample => {
                expect(parseOverrideConfig(incorrectExample)).to.equal(undefined);
            });
        });

        it('should return undefined if string doesn\'t contain cookie name', async () => {
            const incorrectExample = '123';

            expect(parseOverrideConfig(incorrectExample)).to.equal(undefined);
        });

        it('should return undefined if cookie can\'t be parsed with JSON', async () => {
            const incorrectExample = getExampleCookies().replace('overrideConfig=', 'overrideConfig=123');

            expect(parseOverrideConfig(incorrectExample)).to.equal(undefined);
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
            for (let i=0; i<256; i++) {
                const ip = `127.${i}.${i}.${i}`;
                const exampleCookies = getExampleCookies(ip);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
            }
        });

        it('should not sanitize correct config for any 10.x.x.x', async () => {
            for (let i=0; i<256; i++) {
                const ip = `10.${i}.${i}.${i}`;
                const exampleCookies = getExampleCookies(ip);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
            }
        });

        it('should not sanitize correct config for any 192.168.x.x', async () => {
            for (let i=0; i<256; i++) {
                const ip = `192.168.${i}.${i}`;
                const exampleCookies = getExampleCookies(ip);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
            }
        });

        it('should not sanitize correct config for any 172.16.0.0 - 172.31.255.255', async () => {
            for (let i=16; i<32; i++) {
                for (let j=0; j<256; j++) {
                    const ip = `172.${i}.${j}.${j}`;
                    const exampleCookies = getExampleCookies(ip);
                    expect(parseOverrideConfig(exampleCookies)).deep.equal(getExampleObject(ip));
                }
            }
        });
    });

    describe('sanitized', () => {
        it('should sanitize domain names', async () => {
            const ip = 'foo.com';
            const exampleCookies = getExampleCookies(ip);

            expect(parseOverrideConfig(exampleCookies)).deep.equal(getSanitizedObject());
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
            for (let i=0; i<256; i++) {
                const ip = `${i}.${i}.${i}.${i}`;
                const exampleCookies = getExampleCookies(ip);
                if (i !== 10 && i !== 127) {
                    expect(parseOverrideConfig(exampleCookies)).deep.equal(getSanitizedObject(ip));
                }
            }
        });

        it('should sanitize 192.x.x.x and x.168.x.x', async () => {
            const incorrectIps = ['192.1.1.1', '1.168.1.1'];

            incorrectIps.forEach(incorrectIp => {
                let exampleCookies = getExampleCookies(incorrectIp);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getSanitizedObject(incorrectIp));
            });
        });

        it('should sanitize non 172.16.0.0 - 172.31.255.255', async () => {
            const incorrectIps = ['172.15.0.0', '172.32.255.255', '171.16.0.0', '173.31.255.255'];

            incorrectIps.forEach(incorrectIp => {
                let exampleCookies = getExampleCookies(incorrectIp);
                expect(parseOverrideConfig(exampleCookies)).deep.equal(getSanitizedObject(incorrectIp));
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
            const incorrectIps = ['172.15.0.0', '172.32.255.255', '171.16.0.0', '173.31.255.255', '192.1.1.1', '1.168.1.1'];

            incorrectIps.forEach(incorrectIp => {
                const exampleCookies = getExampleCookies(incorrectIp);
                const expectedResult = getExampleObject(incorrectIp);
                expect(parseOverrideConfig(exampleCookies, 'all')).deep.equal(expectedResult);
            });
        });
    });

    describe('trust certain origins', () => {
        it('should not sanitize trusted origins', async () => {
            const trustedExamples = ['foo.com', 'bar.com', '1.1.1.1'];

            trustedExamples.forEach(ip => {
                const exampleCookies = getExampleCookies(ip);
                const expectedResult = getExampleObject(ip);
                expect(parseOverrideConfig(exampleCookies, trustedExamples.toString())).deep.equal(expectedResult);
            });
        });

        it('should not sanitize trusted url w/o protocol', async () => {
            const trustedExamples = ['foo.com', 'bar.com', '1.1.1.1'];

            trustedExamples.forEach(ip => {
                const exampleCookies = getExampleCookies(ip, '');
                const expectedResult = getExampleObject(ip, '');
                expect(parseOverrideConfig(exampleCookies, trustedExamples.toString())).deep.equal(expectedResult);
            });
        });

        it('should sanitize non trusted origins', async () => {
            const trustedExamples = ['foo.com', 'bar.com', '1.1.1.1'];
            const nonTrustedExamples = ['incorrect.com', '2.2.2.2'];

            nonTrustedExamples.forEach(ip => {
                const exampleCookies = getExampleCookies(ip);
                const expectedResult = getSanitizedObject(ip);
                expect(parseOverrideConfig(exampleCookies, trustedExamples.toString())).deep.equal(expectedResult);
            });
        });
    });
});
