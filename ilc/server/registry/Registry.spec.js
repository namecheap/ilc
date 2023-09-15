const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');

const Registry = require('./Registry');

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

    it('getConfig should return right value', async () => {
        const mockGetConfig = () => {
            return () => ({
                data: [
                    {
                        domainName: 'this',
                        template500: 'exist',
                    },
                ],
            });
        };

        const registry = new Registry(address, mockGetConfig, logger);
        const getConfig = await registry.getConfig();

        await chai.expect(getConfig).to.be.eql({
            data: [
                {
                    domainName: 'this',
                    template500: 'exist',
                },
            ],
        });
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
            data: {
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
            },
        };

        const currentDomain = 'foo.com';

        const mockGetConfigWithFilter = () => () => ({ data: IlcConfig });
        const registry = new Registry(address, mockGetConfigWithFilter, logger);
        const getConfig = await registry.getConfig({ filter: { domain: currentDomain } });

        await chai.expect(getConfig).to.be.eql(expectedConfig);
    });

    it('getTemplate should return right value if template name equal 500', async () => {
        const mockGetTemplate = () => {
            return (arg) => ({
                data: [
                    {
                        domainName: 'this',
                        template500: arg || 'exist',
                    },
                ],
            });
        };

        const templateName = '500';
        const forDomain = 'this';

        const registry = new Registry(address, mockGetTemplate, logger);
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
        const mockGetTemplate = () => {
            return (arg) => ({
                data: [
                    {
                        domainName: 'this',
                        template500: arg || 'exist',
                    },
                ],
            });
        };

        const templateName = 'anotherErrorTemplate';
        const forDomain = 'this';

        const registry = new Registry(address, mockGetTemplate, logger);
        const getTemplate = await registry.getTemplate(templateName, { forDomain });

        await chai.expect(getTemplate).to.be.eql({
            data: [
                {
                    domainName: 'this',
                    template500: 'anotherErrorTemplate',
                },
            ],
        });
    });

    it('Registry should preheat only once', async () => {
        const mockPreheat = (callback) => callback;

        nock(address).get('/api/v1/config').reply(200, {
            content: '<ilc-slot id="body" />',
        });

        nock(address).get('/api/v1/template/500/rendered').reply(200, {
            content: '<html><head></head><body><ilc-slot id="body" /></body></html>',
        });

        nock(address).get('/api/v1/router_domains').reply(200);

        const registry = new Registry(address, mockPreheat, logger);
        await registry.preheat();
        await registry.preheat();

        sinon.assert.calledTwice(logger.info);
        sinon.assert.calledWithExactly(logger.info, 'Registry is preheating...');
        sinon.assert.calledWithExactly(logger.info, 'Registry preheated successfully!');
    });

    describe('Handling errors', async () => {
        const mockPreheat = (callback) => callback;

        it('getConfig should throw error', async () => {
            nock(address).get('/api/v1/config').reply(404);

            const registry = new Registry(address, mockPreheat, logger);

            await chai
                .expect(registry.getConfig())
                .to.eventually.rejectedWith('Error while requesting config from registry');
        });

        it('getTemplate should throw error', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(404);

            const registry = new Registry(address, mockPreheat, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith(
                    'Error while requesting rendered template "anotherErrorTemplate" from registry',
                );
        });

        it('getRouterDomains should throw error', async () => {
            nock(address).get('/api/v1/router_domains').reply(404);

            const registry = new Registry(address, mockPreheat, logger);

            await chai
                .expect(registry.getRouterDomains())
                .to.eventually.rejectedWith('Error while requesting routerDomains from registry');
        });

        it('should throw an error when a document does not have <head> and </head>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<body>Hi there! I do not have head tag.</body>',
            });

            const registry = new Registry(address, mockPreheat, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have <head>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '</head><body>Hi there! I do not have head tag.</body>',
            });

            const registry = new Registry(address, mockPreheat, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have </head>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<head><body>Hi there! I do not have closed head tag.</body>',
            });

            const registry = new Registry(address, mockPreheat, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have <body> and </body>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<head></head>Hi there! I do not have body tag.',
            });

            const registry = new Registry(address, mockPreheat, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have <body>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<head></head>Hi there! I do not have opened body tag.</body>',
            });

            const registry = new Registry(address, mockPreheat, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });

        it('should throw an error when a document does not have </body>', async () => {
            nock(address).get('/api/v1/template/anotherErrorTemplate/rendered').reply(200, {
                content: '<head></head><body>Hi there! I do not have closed body tag.',
            });

            const registry = new Registry(address, mockPreheat, logger);

            await chai
                .expect(registry.getTemplate('anotherErrorTemplate'))
                .to.eventually.rejectedWith('Invalid structure in template "anotherErrorTemplate"');
        });
    });

    it('should allow setting attributes on html, head and body tags', async () => {
        nock(address).get('/api/v1/template/tpl/rendered').reply(200, {
            content:
                '<!DOCTYPE html>\n<html lang="en">\n<head attr="1">\n\n</head>\n<body class="custom">\n...\n</body>\n</html> ',
        });
        const mockPreheat = (callback) => callback;

        const registry = new Registry(address, mockPreheat, logger);

        const res = await registry.getTemplate('tpl');
        chai.expect(res.content).includes('<body class="custom">\n...\n</body>');
    });
});
