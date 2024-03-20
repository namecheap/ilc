const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');

const Registry = require('./Registry');
const { ValidationRegistryError, NotFoundRegistryError } = require('./errors');

describe('Registry', () => {
    const address = 'http://registry:8080/';
    const logger = {
        debug: sinon.stub(),
        info: sinon.spy(),
    };

    afterEach(() => {
        logger.debug.reset();
        logger.info.resetHistory();
        nock.cleanAll();
    });

    describe('using cache wrapper', () => {
        let cacheWrapperMock;
        let registry;

        beforeEach(() => {
            cacheWrapperMock = {
                wrap: sinon.stub().returns(() => {
                    return () => ({
                        data: [
                            {
                                domainName: 'this',
                                template500: 'exist',
                            },
                        ],
                    });
                }),
            };

            registry = new Registry(address, cacheWrapperMock, logger);
        });

        it('should cache getConfig function only once', async () => {
            await registry.getConfig();
            await registry.getConfig();
            await registry.getConfig();

            const calls = cacheWrapperMock.wrap.getCalls();

            const specificCalls = calls.filter((call) =>
                call.calledWithExactly(sinon.match.any, {
                    cacheForSeconds: 5,
                    name: 'registry_getConfig',
                }),
            );

            chai.expect(specificCalls).to.have.lengthOf(1);
        });

        it('should cache getTemplate function only once', async () => {
            await registry.getTemplate();
            await registry.getTemplate();
            await registry.getTemplate();

            const calls = cacheWrapperMock.wrap.getCalls();

            const specificCalls = calls.filter((call) =>
                call.calledWithExactly(sinon.match.any, {
                    cacheForSeconds: 30,
                    name: 'registry_getTemplate',
                }),
            );

            chai.expect(specificCalls).to.have.lengthOf(1);
        });

        it('should cache getRouterDomains function only once', async () => {
            await registry.getRouterDomains();
            await registry.getRouterDomains();
            await registry.getRouterDomains();

            const calls = cacheWrapperMock.wrap.getCalls();

            const specificCalls = calls.filter((call) =>
                call.calledWithExactly(sinon.match.any, {
                    cacheForSeconds: 30,
                    name: 'registry_routerDomains',
                }),
            );

            chai.expect(specificCalls).to.have.lengthOf(1);
        });
    });

    it('getConfig should return right value', async () => {
        const config = {
            apps: {
                '@portal/navbar': {
                    kind: 'essential',
                    ssr: {
                        src: 'http://localhost:8235/',
                        timeout: 1000,
                    },
                    dependencies: {
                        react: 'https://cdnjs.cloudflare.com/ajax/libs/react/16.8.6/umd/react.development.js',
                        'react-dom':
                            'https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.8.6/umd/react-dom.development.js',
                    },
                    spaBundle: 'http://localhost:8235/navbar.js',
                },
            },
            templates: ['master', '500', '500ForLocalhostAsIPv4'],
            routes: [
                {
                    slots: {
                        navbar: {
                            appName: '@portal/navbar',
                            props: {},
                            kind: null,
                        },
                    },
                    meta: {},
                    routeId: 1,
                    route: '*',
                    next: true,
                    template: 'master',
                },
            ],
            specialRoutes: [
                {
                    slots: {
                        body: {
                            appName: '@portal/system',
                            props: {
                                _statusCode: '404',
                            },
                            kind: null,
                        },
                        navbar: {
                            appName: '@portal/navbar',
                            props: {},
                            kind: null,
                        },
                    },
                    meta: {},
                    routeId: 7,
                    next: false,
                    template: 'master',
                    specialRole: '404',
                },
            ],
            settings: {
                trailingSlash: 'doNothing',
            },
            sharedLibs: {},
            dynamicLibs: {},
        };
        const cacheWrapperMock = {
            wrap: () => () => ({ data: config }),
        };

        const registry = new Registry(address, cacheWrapperMock, logger);
        const getConfig = await registry.getConfig();

        chai.expect(getConfig).to.be.eql(config);
    });

    it('should return filtered config by domain', async () => {
        const IlcConfig = {
            routes: [
                {
                    domain: 'foo.com',
                    route: '*',
                    slots: {
                        body: {
                            appName: '@portal/homeFoo',
                        },
                    },
                },
                {
                    domain: 'bar.com',
                    route: '*',
                    slots: {
                        body: {
                            appName: '@portal/homeBar',
                        },
                    },
                },
            ],
            specialRoutes: [
                {
                    domain: 'foo.com',
                    specialRole: '404',
                    slots: {
                        navbar: { appName: '@portal/navbar' },
                        body: { appName: '@portal/foo404' },
                    },
                },
                {
                    domain: 'bar.com',
                    specialRole: '404',
                    slots: {
                        navbar: { appName: '@portal/navbar' },
                        body: { appName: '@portal/bar404' },
                    },
                },
            ],
            apps: {
                // apps with routes
                '@portal/homeFoo': {
                    spaBundle: 'http://cdn.com/foo.js',
                },
                '@portal/homeBar': {
                    spaBundle: 'http://cdn.com/bar.js',
                },

                // apps for special 404
                '@portal/navbar': {
                    spaBundle: 'http://cdn.com/navbar.js',
                },
                '@portal/foo404': {
                    spaBundle: 'http://cdn.com/foo404.js',
                },
                '@portal/bar404': {
                    spaBundle: 'http://cdn.com/bar404.js',
                },

                // apps without routes
                '@portal/enforcedForFoo': {
                    enforceDomain: 'foo.com',
                    spaBundle: 'http://cdn.com/enforcedForFoo.js',
                },
                '@portal/enforcedForBar': {
                    enforceDomain: 'bar.com',
                    spaBundle: 'http://cdn.com/enforcedForBar.js',
                },
                '@portal/appWithoutRouteAndWithoutEnforceDomain': {
                    spaBundle: 'http://cdn.com/appWithoutRouteAndWithoutEnforceDomain.js',
                },
            },
        };

        const expectedConfig = {
            routes: [
                {
                    route: '*',
                    slots: {
                        body: {
                            appName: '@portal/homeFoo',
                        },
                    },
                },
            ],
            specialRoutes: {
                404: {
                    slots: {
                        navbar: { appName: '@portal/navbar' },
                        body: { appName: '@portal/foo404' },
                    },
                },
            },
            apps: {
                '@portal/homeFoo': {
                    spaBundle: 'http://cdn.com/foo.js',
                },
                '@portal/navbar': {
                    spaBundle: 'http://cdn.com/navbar.js',
                },
                '@portal/foo404': {
                    spaBundle: 'http://cdn.com/foo404.js',
                },

                '@portal/enforcedForFoo': {
                    spaBundle: 'http://cdn.com/enforcedForFoo.js',
                },
                '@portal/appWithoutRouteAndWithoutEnforceDomain': {
                    spaBundle: 'http://cdn.com/appWithoutRouteAndWithoutEnforceDomain.js',
                },
            },
        };

        const currentDomain = 'foo.com';

        const cacheWrapperMock = {
            wrap: () => () => ({ data: IlcConfig }),
        };

        const registry = new Registry(address, cacheWrapperMock, logger);
        const getConfig = await registry.getConfig({ filter: { domain: currentDomain } });

        chai.expect(getConfig).to.be.eql(expectedConfig);
    });

    it('getTemplate should return right value if template name equal 500', async () => {
        const cacheWrapperMock = {
            wrap: () => (arg) => ({
                data: [
                    {
                        domainName: 'this',
                        template500: arg || 'exist',
                    },
                ],
            }),
        };

        const templateName = '500';
        const forDomain = 'this';

        const registry = new Registry(address, cacheWrapperMock, logger);
        const getTemplate = await registry.getTemplate(templateName, { forDomain });

        await chai.expect(getTemplate).to.be.eql({
            data: [
                {
                    domainName: 'this',
                    template500: 'exist',
                },
            ],
        });
    });

    it('getTemplate should return right value if template name not equal 500', async () => {
        const cacheWrapperMock = {
            wrap: () => (arg) => ({
                data: [
                    {
                        domainName: 'this',
                        template500: arg || 'exist',
                    },
                ],
            }),
        };

        const templateName = 'anotherErrorTemplate';
        const forDomain = 'this';

        const registry = new Registry(address, cacheWrapperMock, logger);
        const getTemplate = await registry.getTemplate(templateName, { forDomain });

        chai.expect(getTemplate).to.be.eql({
            data: [
                {
                    domainName: 'this',
                    template500: 'anotherErrorTemplate',
                },
            ],
        });
    });

    it('Registry should preheat only once', async () => {
        const cacheWrapperMock = {
            wrap: (callback) => callback,
        };

        nock(address).get('/api/v1/config').reply(200, {
            content: '<ilc-slot id="body" />',
        });

        nock(address).get('/api/v1/template/500/rendered').reply(200, {
            content: '<html><head></head><body><ilc-slot id="body" /></body></html>',
        });

        nock(address).get('/api/v1/router_domains').reply(200);

        const registry = new Registry(address, cacheWrapperMock, logger);
        await registry.preheat();
        await registry.preheat();

        sinon.assert.calledTwice(logger.info);
        sinon.assert.calledWithExactly(logger.info, 'Registry is preheating...');
        sinon.assert.calledWithExactly(logger.info, 'Registry preheated successfully!');
    });

    describe('Handling errors', async () => {
        const cacheWrapperMock = {
            wrap: (callback) => callback,
        };

        it('getConfig should throw error', async () => {
            nock(address).get('/api/v1/config').reply(404);

            const registry = new Registry(address, cacheWrapperMock, logger);

            await chai
                .expect(registry.getConfig())
                .to.eventually.rejectedWith('Error while requesting config from registry');
        });

        it('getTemplate should throw error', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(404);

            const registry = new Registry(address, cacheWrapperMock, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith(NotFoundRegistryError);
        });

        it('getRouterDomains should throw error', async () => {
            nock(address).get('/api/v1/router_domains').reply(404);

            const registry = new Registry(address, cacheWrapperMock, logger);

            await chai
                .expect(registry.getRouterDomains())
                .to.eventually.rejectedWith('Error while requesting routerDomains from registry');
        });

        it('should throw an error when a document does not have <head> and </head>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<body>Hi there! I do not have head tag.</body>',
            });

            const registry = new Registry(address, cacheWrapperMock, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have <head>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '</head><body>Hi there! I do not have head tag.</body>',
            });

            const registry = new Registry(address, cacheWrapperMock, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have </head>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<head><body>Hi there! I do not have closed head tag.</body>',
            });

            const registry = new Registry(address, cacheWrapperMock, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have <body> and </body>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<head></head>Hi there! I do not have body tag.',
            });

            const registry = new Registry(address, cacheWrapperMock, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have <body>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<head></head>Hi there! I do not have opened body tag.</body>',
            });

            const registry = new Registry(address, cacheWrapperMock, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have </body>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<head></head><body>Hi there! I do not have closed body tag.',
            });

            const registry = new Registry(address, cacheWrapperMock, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });
        it('should throw error if template name is not valid', async () => {
            const cases = ['', '../../package.json', 'A'.repeat(51)];

            await Promise.all(
                cases.map(async (x) => {
                    const registry = new Registry(address, cacheWrapperMock, logger);

                    await chai.expect(registry.getTemplate(x)).to.eventually.rejectedWith(ValidationRegistryError);
                }),
            );
        });
    });

    it('should allow setting attributes on html, head and body tags', async () => {
        nock(address).get('/api/v1/template/tpl/rendered').reply(200, {
            content:
                '<!DOCTYPE html>\n<html lang="en">\n<head attr="1">\n\n</head>\n<body class="custom">\n...\n</body>\n</html> ',
        });

        const cacheWrapperMock = {
            wrap: (callback) => callback,
        };

        const registry = new Registry(address, cacheWrapperMock, logger);

        const res = await registry.getTemplate('tpl');
        chai.expect(res.content).includes('<body class="custom">\n...\n</body>');
    });
});
