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
                await req
                    .post('/api/v1/app/')
                    .send({
                        ...example.apps,
                        name: `${example.apps.name}enforceDomain`,
                        enforceDomain: routerDomainsId,
                    })
                    .expect(200);

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

                expect(_.omit(response.body.apps[`${example.apps.name}enforceDomain`], 'versionId')).deep.equal(
                    _.omit(
                        {
                            ...example.apps,
                            props: example.sharedProps.props,
                            enforceDomain: example.routerDomains.domainName,
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
                routeIdWithoutSlots && (await req.delete('/api/v1/route/' + routeIdWithoutSlots));
                await req.delete('/api/v1/app/' + encodeURIComponent(example.apps.name));
                await req.delete('/api/v1/app/' + encodeURIComponent(`${example.apps.name}enforceDomain`));
                await req.delete('/api/v1/shared_props/' + example.sharedProps.name);
                await req.delete('/api/v1/shared_libs/' + example.sharedLibs.name);
                routerDomainsId && (await req.delete('/api/v1/router_domains/' + routerDomainsId));
                await req.delete('/api/v1/template/' + example.templates.name).expect(204);
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
            namespace: 'ns1',
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
        it('same routes in single namespace without explicit ordering', async () => {
            const unordered = { ...appRoute('unordered') };
            const ordered = { ...appRoute('ordered'), orderPos: 29 };
            const { body: response } = await req
                .post('/api/v1/config/validate')
                .send({
                    ...body,
                    routes: [
                        unordered,
                        unordered,
                        ordered,
                        ordered,
                        { ...appRoute('ordered'), namespace: 'ns2' },
                        appRoute('domain'),
                        { ...appRoute('domain'), domainId: 1 },
                    ],
                })
                .expect(200, {
                    valid: false,
                    details:
                        'Multiple routes with the same "route" and "domainId" and without "orderPos" are present in the passed update:[\n  {\n    "route": "/unordered/*",\n    "slots": {\n      "body": {\n        "appName": "unordered",\n        "props": {\n          "c": true\n        }\n      }\n    },\n    "namespace": "ns1"\n  }\n]To update, ensure that each of these routes has a unique "orderPos" value for the given "domainId".',
                });
        });
    });
    describe('Update', () => {
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
            namespace: 'ns1',
        });
        const sharedLib = {
            name: 'lib1',
            assetsDiscoveryUrl: 'https://localhost:8080/sample-nodejs/assets-discovery.json',
            l10nManifest: 'https://localhost:8080/sample-nodejs/assets-discovery.json',
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
                    spaBundle: '/sample-nodejs/app.47b9b19062e648845f15.js',
                    cssBundle: '/sample-nodejs/app.69a700bb199fb57a1c70.css',
                })
                .persist();
        });

        after(() => {
            nock.cleanAll();
        });

        it('should update successfully', async () => {
            let routeIds = [];
            try {
                await req.put('/api/v1/config').send(body).expect(204);
                const { body: config } = await req.get('/api/v1/config');
                expect(config.apps.app1).to.deep.include({
                    kind: 'primary',
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
                    spaBundle: 'https://localhost:8080/sample-nodejs/app.47b9b19062e648845f15.js',
                    cssBundle: 'https://localhost:8080/sample-nodejs/app.69a700bb199fb57a1c70.css',
                });
                expect(config.apps.app2).to.deep.include({
                    kind: 'primary',
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
                    spaBundle: 'https://localhost:8080/sample-nodejs/app.47b9b19062e648845f15.js',
                    cssBundle: 'https://localhost:8080/sample-nodejs/app.69a700bb199fb57a1c70.css',
                });
                expect(config.routes[0]).to.deep.include({
                    slots: {
                        body: {
                            appName: 'app1',
                            kind: null,
                            props: {
                                c: true,
                            },
                        },
                    },
                    meta: {},
                    routeId: 36,
                    route: '/app1/*',
                    next: false,
                    orderPos: 10,
                });
                expect(config.routes[1]).to.deep.include({
                    slots: {
                        body: {
                            appName: 'app2',
                            kind: null,
                            props: {
                                c: true,
                            },
                        },
                    },
                    meta: {},
                    routeId: 37,
                    route: '/app2/*',
                    next: false,
                    orderPos: 20,
                });
                expect(config.dynamicLibs.lib1).to.include({
                    spaBundle: 'https://localhost:8080/sample-nodejs/app.47b9b19062e648845f15.js',
                    l10nManifest: 'https://localhost:8080/sample-nodejs/assets-discovery.json',
                });
                expect(config.dynamicLibs.lib2).to.include({
                    spaBundle: 'https://localhost:8080/sample-nodejs/app.47b9b19062e648845f15.js',
                    l10nManifest: 'https://localhost:8080/sample-nodejs/assets-discovery.json',
                });

                routeIds = config.routes.map((x: any) => x.routeId);
            } finally {
                await req.delete(`/api/v1/route/${routeIds[0]}`);
                await req.delete(`/api/v1/route/${routeIds[1]}`);
                await req.delete('/api/v1/app/app1');
                await req.delete('/api/v1/app/app2');
                await req.delete('/api/v1/shared_libs/lib1');
                await req.delete('/api/v1/shared_libs/lib2');
            }
        });
        it('should remove not included in request items', async () => {
            let routeIds = [];
            try {
                await req.put('/api/v1/config').send(body).expect(204);
                await req
                    .put('/api/v1/config')
                    .send({ ...body, apps: body.apps.slice(1), routes: body.routes.slice(1) })
                    .expect(204);
                const { body: config } = await req.get('/api/v1/config');
                expect(config.apps.app1).to.be.undefined;
                expect(config.apps.app2).to.deep.include({
                    kind: 'primary',
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
                    spaBundle: 'https://localhost:8080/sample-nodejs/app.47b9b19062e648845f15.js',
                    cssBundle: 'https://localhost:8080/sample-nodejs/app.69a700bb199fb57a1c70.css',
                });
                expect(config.routes).to.have.lengthOf(1);
                expect(config.routes[0]).to.deep.include({
                    slots: {
                        body: {
                            appName: 'app2',
                            kind: null,
                            props: {
                                c: true,
                            },
                        },
                    },
                    meta: {},
                    routeId: 39,
                    route: '/app2/*',
                    next: false,
                    orderPos: 20,
                });

                routeIds = config.routes.map((x: any) => x.routeId);
            } finally {
                await req.delete(`/api/v1/route/${routeIds[0]}`);
                await req.delete('/api/v1/app/app1');
                await req.delete('/api/v1/app/app2');
                await req.delete('/api/v1/shared_libs/lib1');
                await req.delete('/api/v1/shared_libs/lib2');
            }
        });
        it('should not update all when 1 item failed', async () => {
            const invalidApp = {
                ...app,
                name: 'app1',
                ssr: {
                    src: 'invalid',
                    timeout: 3000,
                },
            };
            try {
                await req
                    .put('/api/v1/config')
                    .send({ ...body, apps: [...body.apps, invalidApp] })
                    .expect(422);
                const { body: config } = await req.get('/api/v1/config');
                expect(config.apps).to.eql({});
                expect(config.routes).to.eql([]);
                expect(config.dynamicLibs).to.eql({});
            } finally {
                await req.delete('/api/v1/app/app1');
                await req.delete('/api/v1/app/app2');
                await req.delete('/api/v1/shared_libs/lib1');
                await req.delete('/api/v1/shared_libs/lib2');
            }
        });
        it('should not delete anything if update failed', async () => {
            const invalidApp = {
                ...app,
                name: 'app1',
                ssr: {
                    src: 'invalid',
                    timeout: 3000,
                },
            };

            let routeIds = [];
            try {
                await req.put('/api/v1/config').send(body).expect(204);
                const { body: configBefore } = await req.get('/api/v1/config').expect(200);
                await req
                    .put('/api/v1/config')
                    .send({ ...body, apps: [...body.apps, invalidApp] })
                    .expect(422);
                const { body: configBeforeAfter } = await req.get('/api/v1/config');
                expect(configBefore).to.eql(configBeforeAfter);

                routeIds = configBefore.routes.map((x: any) => x.routeId);
            } finally {
                await req.delete(`/api/v1/route/${routeIds[0]}`);
                await req.delete(`/api/v1/route/${routeIds[1]}`);
                await req.delete('/api/v1/app/app1');
                await req.delete('/api/v1/app/app2');
                await req.delete('/api/v1/shared_libs/lib1');
                await req.delete('/api/v1/shared_libs/lib2');
            }
        });

        it('should not delete resources without namespace', async () => {
            let routeIds = [];
            try {
                await req
                    .put('/api/v1/config')
                    .send({
                        apps: [
                            {
                                ...app,
                                name: 'app3',
                                namespace: undefined,
                            },
                        ],
                        routes: [{ ...appRoute('app3'), namespace: undefined }],
                    })
                    .expect(204);
                await req
                    .put('/api/v1/config')
                    .send({
                        apps: [
                            {
                                ...app,
                                name: 'app4',
                                namespace: undefined,
                            },
                        ],
                        routes: [{ ...appRoute('app4'), namespace: undefined }],
                    })
                    .expect(204);
                const { body: config } = await req.get('/api/v1/config');
                expect(config.apps.app3).to.deep.include({
                    kind: 'primary',
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
                    spaBundle: 'https://localhost:8080/sample-nodejs/app.47b9b19062e648845f15.js',
                    cssBundle: 'https://localhost:8080/sample-nodejs/app.69a700bb199fb57a1c70.css',
                });
                expect(config.apps.app4).to.deep.include({
                    kind: 'primary',
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
                    spaBundle: 'https://localhost:8080/sample-nodejs/app.47b9b19062e648845f15.js',
                    cssBundle: 'https://localhost:8080/sample-nodejs/app.69a700bb199fb57a1c70.css',
                });
                expect(config.routes[0]).to.deep.include({
                    slots: {
                        body: {
                            appName: 'app3',
                            kind: null,
                            props: {
                                c: true,
                            },
                        },
                    },
                    meta: {},
                    routeId: 43,
                    route: '/app3/*',
                    next: false,
                });
                expect(config.routes[1]).to.deep.include({
                    slots: {
                        body: {
                            appName: 'app4',
                            kind: null,
                            props: {
                                c: true,
                            },
                        },
                    },
                    meta: {},
                    routeId: 44,
                    route: '/app4/*',
                    next: false,
                });
                routeIds = config.routes.map((x: any) => x.routeId);
            } finally {
                await req.delete(`/api/v1/route/${routeIds[0]}`);
                await req.delete(`/api/v1/route/${routeIds[1]}`);
                await req.delete('/api/v1/app/app3');
                await req.delete('/api/v1/app/app4');
            }
        });

        it('when orderPos removed should assign highest one', async () => {
            let routeIds = [];
            let config;
            try {
                await req
                    .put('/api/v1/config')
                    .send({
                        routes: [
                            {
                                route: '/route1/',
                                namespace: 'ns1',
                            },
                        ],
                    })
                    .expect(204);
                ({ body: config } = await req.get('/api/v1/config').expect(200));
                expect(config.routes[0]).to.deep.include({
                    route: '/route1/',
                });
                const orderPos = config.routes[0].orderPos;
                const nextOrderPos = orderPos + 10;
                await req
                    .put('/api/v1/config')
                    .send({
                        routes: [
                            {
                                route: '/route2/',
                                orderPos: nextOrderPos,
                                namespace: 'ns2',
                            },
                        ],
                    })
                    .expect(204);
                ({ body: config } = await req.get('/api/v1/config').expect(200));
                expect(config.routes[1]).to.deep.include({
                    route: '/route2/',
                    orderPos: nextOrderPos,
                });
                const res = await req
                    .put('/api/v1/config')
                    .send({
                        routes: [
                            {
                                route: '/route3/',
                                namespace: 'ns3',
                            },
                            {
                                route: '/route4/',
                                namespace: 'ns3',
                            },
                        ],
                    })
                    .expect(204);
                ({ body: config } = await req.get('/api/v1/config').expect(200));
                expect(config.routes[2]).to.deep.include({
                    route: '/route3/',
                    orderPos: nextOrderPos + 10,
                });
                expect(config.routes[3]).to.deep.include({
                    route: '/route4/',
                    orderPos: nextOrderPos + 20,
                });
            } finally {
                const { body: routesWithId } = await req.get('/api/v1/route');
                await Promise.all(routesWithId.map((x: any) => req.delete(`/api/v1/route/${x.id}`).expect(204)));
            }
        });
        it('should not change existing orderPos if not provided', async () => {
            try {
                await req.put('/api/v1/config').send({
                    routes: [
                        {
                            route: '/route1/',
                            namespace: 'ns1',
                        },
                    ],
                });
                let config;
                ({ body: config } = await req.get('/api/v1/config').expect(200));
                expect(config.routes[0]).to.deep.include({
                    route: '/route1/',
                });
                const orderPos = config.routes[0].orderPos;
                await req.put('/api/v1/config').send({
                    routes: [
                        {
                            route: '/route1/',
                            namespace: 'ns1',
                        },
                    ],
                });
                ({ body: config } = await req.get('/api/v1/config').expect(200));
                expect(config.routes[0]).to.deep.include({
                    route: '/route1/',
                    orderPos,
                });
            } finally {
                const { body: routesWithId } = await req.get('/api/v1/route');
                await Promise.all(routesWithId.map((x: any) => req.delete(`/api/v1/route/${x.id}`).expect(204)));
            }
        });
        it('correctly process multiple routes with same route', async () => {
            let routeIds = [];
            try {
                await req.post('/api/v1/template/').send(example.templates).expect(200);
                const body = {
                    apps: [
                        {
                            name: 'header',
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
                            namespace: 'ns10',
                        },
                    ],
                    routes: [
                        {
                            route: '*',
                            next: true,
                            templateName,
                            orderPos: -1000,
                            slots: {
                                header: {
                                    appName: 'header',
                                    kind: 'essential',
                                    props: {
                                        appProps: { ui: { header: { theme: 'brand' } } },
                                        requestUrl: '/header',
                                    },
                                },
                            },
                            namespace: 'ns10',
                        },
                        {
                            route: '*',
                            next: true,
                            orderPos: 0,
                            slots: {
                                footer: {
                                    appName: 'header',
                                    kind: 'regular',
                                    props: { requestUrl: '/footer' },
                                },
                            },
                            namespace: 'ns10',
                        },
                        {
                            route: '/secret',
                            slots: {
                                body: {
                                    appName: 'header',
                                    kind: 'primary',
                                    props: { requestUrl: '/home' },
                                },
                            },
                            namespace: 'ns10',
                        },
                    ],
                };
                const { body: error } = await req.put('/api/v1/config').send(body).expect(204);
                const { body: config } = await req.get('/api/v1/config').expect(200);
                expect(config.routes).to.have.lengthOf(3);

                expect(config.routes[0]).to.deep.include({
                    route: '*',
                    next: true,
                    orderPos: -1000,
                    template: templateName,
                    slots: {
                        header: {
                            appName: 'header',
                            kind: 'essential',
                            props: {
                                appProps: { ui: { header: { theme: 'brand' } } },
                                requestUrl: '/header',
                            },
                        },
                    },
                });

                expect(config.routes[1]).to.deep.include({
                    route: '*',
                    next: true,
                    orderPos: 0,
                    slots: {
                        footer: {
                            appName: 'header',
                            kind: 'regular',
                            props: { requestUrl: '/footer' },
                        },
                    },
                });

                expect(config.routes[2]).to.deep.include({
                    route: '/secret',
                    next: false,
                    slots: {
                        body: {
                            appName: 'header',
                            kind: 'primary',
                            props: { requestUrl: '/home' },
                        },
                    },
                });
                routeIds = config.routes.map((x: any) => x.routeId);
            } finally {
                await Promise.all(routeIds.map((id: number) => req.delete(`/api/v1/route/${id}`).expect(204)));
                await req.delete(`/api/v1/app/header`);
                await req.delete('/api/v1/template/' + example.templates.name);
            }
        });
    });
});
