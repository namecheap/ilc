import _ from 'lodash';
import { type Agent } from 'supertest';

import nock from 'nock';
import db from '../server/db';
import { OnPropsUpdateValues, SettingKeys, TrailingSlashValues } from '../server/settings/interfaces';
import { isPostgres } from '../server/util/db';
import { expect, request, requestWithAuth } from './common';

const templateName = 'ncTestTemplateName';
const example = {
    apps: Object.freeze({
        name: '@portal/ncTestAppName',
        spaBundle: 'http://localhost:1234/ncTestAppReactssr.js',
        cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssr.css',
        configSelector: ['ncTestSharedPropsName'],
        ssr: {
            src: 'http://127.0.0.1:1234/fragment',
            timeout: 1000,
        },
        kind: 'primary',
    }),
    appRoutes: Object.freeze({
        orderPos: 122,
        route: '/ncTestRoute/*',
        next: false,
        slots: {
            ncTestRouteSlotName: {
                appName: '@portal/ncTestAppName',
                props: { ncTestProp: 1 },
                kind: 'regular',
            },
        },
        meta: {
            first: null,
            second: 3000,
            third: 'value',
        },
    }),
    appRoutesWithoutSlots: Object.freeze({
        orderPos: 124,
        route: '/routeWithoutSlots/',
        next: false,
        slots: {},
        meta: {},
        templateName,
    }),
    templates: Object.freeze({
        name: templateName,
        content: '<html><head></head><body>ncTestTemplateContent</body></html>',
    }),
    sharedProps: Object.freeze({
        name: 'ncTestSharedPropsName',
        props: {
            ncTestSharedPropsPropName: 'ncTestSharedPropsPropValue',
        },
    }),
    routerDomains: Object.freeze({
        domainName: 'domainNameCorrect.com',
        template500: templateName,
    }),
    sharedLibs: Object.freeze({
        name: 'testSharedLibName',
        spaBundle: 'http://localhost:1234/testSharedLibBundle.js',
        adminNotes: 'Lorem ipsum dolor',
    }),
};

describe('Tests /api/v1/config', () => {
    let req: Agent;
    let reqWithAuth: Agent;

    beforeEach(async () => {
        req = await request();
        reqWithAuth = await requestWithAuth();
    });

    describe('Read', () => {
        it('should successfully return config', async () => {
            let routeId, routerDomainsId, routeIdWithDomain, routeIdWithoutSlots;

            try {
                await req.post('/api/v1/template/').send(example.templates).expect(200);
                const responseRouterDomains = await req
                    .post('/api/v1/router_domains/')
                    .send(example.routerDomains)
                    .expect(200);
                routerDomainsId = responseRouterDomains.body.id;

                await req.post('/api/v1/app/').send(example.apps).expect(200);

                const responseRoute = await req.post('/api/v1/route/').send(example.appRoutes).expect(200);
                routeId = responseRoute.body.id;

                const responseRouteWithDomain = await req
                    .post('/api/v1/route/')
                    .send({
                        ...example.appRoutes,
                        orderPos: 123,
                        domainId: routerDomainsId,
                    })
                    .expect(200);
                routeIdWithDomain = responseRouteWithDomain.body.id;

                const responseRouteWithoutSlots = await req
                    .post('/api/v1/route/')
                    .send(example.appRoutesWithoutSlots)
                    .expect(200);
                routeIdWithoutSlots = responseRouteWithoutSlots.body.id;

                await req.post('/api/v1/shared_props/').send(example.sharedProps).expect(200);

                await req.post('/api/v1/shared_libs/').send(example.sharedLibs).expect(200);

                const response = await req.get('/api/v1/config').expect(200);

                expect(response.text).to.be.a('string');
                expect(response.body).to.be.an('object');

                expect(response.body.apps).to.be.an('object');
                expect(response.body.templates).to.be.an('array');
                expect(response.body.routes).to.be.an('array');
                expect(response.body.specialRoutes).to.be.an('array');
                expect(response.body.routerDomains).to.be.undefined;
                expect(response.body.sharedLibs).to.be.an('object');

                expect(response.body.apps[example.apps.name].versionId).to.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);
                delete response.body.apps[example.apps.name].versionId;

                response.body.routes.forEach((route: any) => {
                    expect(route.versionId).to.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);
                    delete route.versionId;
                });

                expect(response.body.routes).to.deep.include({
                    routeId,
                    ..._.pick(example.appRoutes, ['route', 'next', 'slots', 'meta', 'orderPos']),
                });

                expect(response.body.routes).to.deep.include({
                    routeId: routeIdWithDomain,
                    domain: example.routerDomains.domainName,
                    orderPos: 123,
                    ..._.pick(example.appRoutes, ['route', 'next', 'slots', 'meta']),
                });

                expect(response.body.routes).to.deep.include({
                    ..._.omit(example.appRoutesWithoutSlots, ['templateName']),
                    template: example.appRoutesWithoutSlots.templateName,
                });

                expect(response.body.apps[example.apps.name]).deep.equal(
                    _.omit(
                        {
                            ...example.apps,
                            props: example.sharedProps.props,
                        },
                        ['name', 'configSelector'],
                    ),
                );

                expect(response.body.templates).to.include(example.templates.name);

                expect(response.body.templatesVersions).have.lengthOf(1);
                expect(response.body.templatesVersions[0]).to.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);

                expect(response.body.settings).to.deep.equal({
                    [SettingKeys.TrailingSlash]: TrailingSlashValues.DoNothing,
                    [SettingKeys.AmdDefineCompatibilityMode]: false,
                    globalSpinner: {
                        enabled: true,
                    },
                    cspTrustedLocalHosts: ['https://localhost'],
                    cspEnableStrict: false,
                    i18n: {
                        default: {
                            currency: 'USD',
                            locale: 'en-US',
                        },
                        enabled: true,
                        supported: {
                            currency: ['USD', 'UAH'],
                            locale: ['en-US', 'ua-UA'],
                        },
                        routingStrategy: 'prefix_except_default',
                    },
                    [SettingKeys.OnPropsUpdate]: OnPropsUpdateValues.Remount,
                });

                expect(response.body.sharedLibs).include({
                    [example.sharedLibs.name]: example.sharedLibs.spaBundle,
                });
            } finally {
                routeId && (await req.delete('/api/v1/route/' + routeId));
                routeIdWithDomain && (await req.delete('/api/v1/route/' + routeIdWithDomain));
                routerDomainsId && (await req.delete('/api/v1/router_domains/' + routerDomainsId));
                routeIdWithoutSlots && (await req.delete('/api/v1/route/' + routeIdWithoutSlots));
                await req.delete('/api/v1/template/' + example.templates.name);
                await req.delete('/api/v1/app/' + encodeURIComponent(example.apps.name));
                await req.delete('/api/v1/shared_props/' + example.sharedProps.name);
                await req.delete('/api/v1/shared_libs/' + example.sharedLibs.name);
            }
        });
    });

    describe('Authentication / Authorization', () => {
        it('should be accessible w/o authentication', async () => {
            await reqWithAuth.get('/api/v1/config').expect(200);
        });
    });

    describe('Validate', () => {
        const app = {
            assetsDiscoveryUrl: 'https://localhost:8080/sample-nodejs/assets-discovery.json',
            ssr: {
                src: 'http://base.local/ui/sample-nodejs/',
                timeout: 3000,
            },
            props: {
                appConfig: {
                    a: true,
                },
            },
            ssrProps: {
                appConfig: { b: true },
            },
            configSelector: ['props'],
            kind: 'primary',
            discoveryMetadata: {},
            namespace: 'ns1',
        };
        const appRoute = (name: string) => ({
            route: `/${name}/*`,
            slots: {
                body: {
                    appName: name,
                    props: { c: true },
                },
            },
        });
        const sharedLib = {
            name: 'lib1',
            assetsDiscoveryUrl: 'https://localhost:8080/sample-nodejs/assets-discovery.json',
        };
        const body = {
            apps: [
                { ...app, name: 'app1' },
                { ...app, name: 'app2' },
            ],
            routes: [appRoute('app1'), appRoute('app2')],
            sharedLibs: [
                { ...sharedLib, name: 'lib1' },
                { ...sharedLib, name: 'lib2' },
            ],
        };

        before(function () {
            if (!isPostgres(db)) {
                return this.skip();
            }

            nock('https://localhost:8080')
                .get('/sample-nodejs/assets-discovery.json')
                .reply(200, {
                    dependencies: {},
                    spaBundle: '/app/app.f2a9523cffaa06996119.js',
                    cssBundle: '/app/app.fdfd17cfd0267be2c165.css',
                })
                .persist();
        });

        after(() => {
            nock.cleanAll();
        });

        it('should validate successfully', async () => {
            await req.post('/api/v1/config/validate').send(body).expect(200, { valid: true });
        });
        it('should fail on invalid app config', async () => {
            await req
                .post('/api/v1/config/validate')
                .send({
                    ...body,
                    apps: [
                        ...body.apps,
                        {
                            ...app,
                            props: 2,
                        },
                    ],
                })
                .expect(200, {
                    valid: false,
                    details: '"props" must be of type object',
                });
        });
        it('should fail on duplicate orderPos', async () => {
            let routeId;
            try {
                const { body: existingRoute } = await req
                    .post('/api/v1/route')
                    .send({
                        route: '/existing',
                        orderPos: 200,
                    })
                    .expect(200);
                routeId = existingRoute.id;

                await req
                    .post('/api/v1/config/validate')
                    .send({
                        ...body,
                        routes: [
                            {
                                ...appRoute('app1'),
                                orderPos: 200,
                            },
                        ],
                    })
                    .expect(200, {
                        valid: false,
                        details:
                            'Specified "orderPos" value already exists for routes with provided "domainId" and "namespace"',
                    });
            } finally {
                routeId && (await req.delete(`/api/v1/route/${routeId}`).expect(204));
            }
        });
        it('should fail on invalid wrapper', async () => {
            await req
                .post('/api/v1/config/validate')
                .send({
                    ...body,
                    apps: [
                        ...body.apps,
                        {
                            ...app,
                            name: 'app3',
                            wrappedWith: 'invalid',
                        },
                    ],
                })
                .expect(200, {
                    valid: false,
                    details: 'Specified wrapper app is not a wrapper.',
                });
        });
        it('should fail on invalid asset discovery url', async () => {
            await req
                .post('/api/v1/config/validate')
                .send({
                    ...body,
                    apps: [
                        ...body.apps,
                        {
                            ...app,
                            name: 'app3',
                            assetsDiscoveryUrl: 'http://localhost:1/1.json',
                        },
                    ],
                })
                .expect(200, {
                    valid: false,
                    details:
                        '"assetsDiscoveryUrl" http://localhost:1/1.json is not available. Check the url via browser manually.',
                });
        });
        it('should fail on invalid route domainId', async () => {
            await req
                .post('/api/v1/config/validate')
                .send({
                    ...body,
                    routes: [
                        {
                            ...appRoute('app1'),
                            domainId: 100,
                        },
                    ],
                })
                .expect(200, {
                    valid: false,
                    details: 'Specified "domainId" value does not exist',
                });
        });
        it('should fail on invalid route template', async () => {
            await req
                .post('/api/v1/config/validate')
                .send({
                    ...body,
                    routes: [
                        {
                            ...appRoute('app1'),
                            templateName: 'invalid',
                        },
                    ],
                })
                .expect(200, {
                    valid: false,
                    details: 'Specified "templateName" value does not exist',
                });
        });
        it('should fail on invalid domain id in app', async () => {
            await req
                .post('/api/v1/config/validate')
                .send({
                    ...body,
                    apps: [
                        ...body.apps,
                        {
                            ...app,
                            name: 'app3',
                            enforceDomain: 100,
                        },
                    ],
                })
                .expect(200, {
                    valid: false,
                    details: 'Specified "enforceDomain" domainId value does not exist',
                });
        });
    });
});
