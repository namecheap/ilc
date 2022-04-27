import _ from 'lodash';
import supertest from 'supertest';

import {SettingKeys, TrailingSlashValues, OnPropsUpdateValues} from '../server/settings/interfaces';
import {request, expect, requestWithAuth} from './common';

describe('Tests 1/api/v1/config', () => {
    let req: supertest.SuperTest<supertest.Test>;
    let reqWithAuth: supertest.SuperTest<supertest.Test>;
    const templateName = 'ncTestTemplateName';

    const routerDomains = Object.freeze({
        domainName: '127.0.0.1:8233',
        template500: templateName,
    });

    const example = {
        routerDomains,
        apps: Object.freeze({
            name: '@portal/ncTestAppName',
            spaBundle: 'http://localhost:1234/ncTestAppReactssr.js',
            cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssr.css',
            configSelector: ['ncTestSharedPropsName'],
            ssr: {
                src: "http://127.0.0.1:1234/fragment",
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
                    props: {ncTestProp: 1},
                    kind: 'regular',
                },
            },
            meta: {
                first: null,
                second: 3000,
                third: 'value',
            },
        }),
        templates: Object.freeze({
            name: templateName,
            content: 'ncTestTemplateContent'
        }),
        sharedProps: Object.freeze({
            name: 'ncTestSharedPropsName',
            props: {
                ncTestSharedPropsPropName: 'ncTestSharedPropsPropValue',
            }
        }),
        sharedLibs: Object.freeze({
            name: 'testSharedLibName',
            spaBundle: 'http://localhost:1234/testSharedLibBundle.js',
            adminNotes: 'Lorem ipsum dolor',
        }),
    } as const;


    beforeEach(async () => {
        req = await request();
        reqWithAuth = await requestWithAuth();
    });

    let routeId: number;
    let domainId: number;
    let routeIdWithDomain: number;

    afterEach(async () => {
        routeId && await req.delete('/api/v1/route/' + routeId);
        routeIdWithDomain && await req.delete('/api/v1/route/' + routeIdWithDomain);
        domainId && await req.delete('/api/v1/router_domains/' + domainId);
        await req.delete('/api/v1/template/' + example.templates.name);
        await req.delete('/api/v1/app/' + encodeURIComponent(example.apps.name));
        await req.delete('/api/v1/shared_props/' + example.sharedProps.name);
        await req.delete('/api/v1/shared_libs/' + example.sharedLibs.name);
    });

    const getRouterDomains = async ({templates, routerDomains}: typeof example) => {
        await req.post('/api/v1/template/')
            .send(templates)
            .expect(200);

        const responseRouterDomains = await req.post('/api/v1/router_domains/')
            .send(routerDomains)
            .expect(200);

        await req.post('/api/v1/app/').send(example.apps).expect(200);

        return responseRouterDomains.body;
    };

    const preRequest = async (data: typeof example): Promise<void> => {
        const {id} = await getRouterDomains(data);
        domainId = id;

        const route = await req.post('/api/v1/route/')
            .send(example.appRoutes)
            .expect(200);
        routeId = route.body.id;

        const responseRouteWithDomain = await req.post('/api/v1/route/').send({
            ...example.appRoutes,
            orderPos: 100,
            domainId,
        }).expect(200);

        routeIdWithDomain = responseRouteWithDomain.body.id;

        await req.post('/api/v1/shared_props/')
            .send(example.sharedProps)
            .expect(200);

        await req.post('/api/v1/shared_libs/')
            .send(example.sharedLibs)
            .expect(200);
    }

    describe('Read', () => {
        it('should successfully return config', async () => {
            try {
                const host = '127.0.0.1';
                const domainName = '*';
                const routerDomains = await getRouterDomains(example);
                domainId = routerDomains.id;

                const responseRoute = await req.post('/api/v1/route/').send(example.appRoutes).expect(200);
                routeId = responseRoute.body.id;

                const responseRouteWithDomain = await req.post('/api/v1/route/').send({
                    ...example.appRoutes,
                    orderPos: 123,
                    domainId,
                }).expect(200);
                routeIdWithDomain = responseRouteWithDomain.body.id;

                await req.post('/api/v1/shared_props/').send(example.sharedProps).expect(200);

                await req.post('/api/v1/shared_libs/').send(example.sharedLibs).expect(200);

                const response = await req.get('/api/v1/config')
                    .set('Host', host)
                    .expect(200);

                expect(response.text).to.be.a('string');
                expect(response.body).to.be.an('object');
                expect(response.body.apps).to.be.an('object');
                expect(response.body.templates).to.be.an('array');
                expect(response.body.routes).to.be.an('array');
                expect(response.body.specialRoutes).to.be.an('array');
                expect(response.body.routerDomains).to.be.undefined;
                expect(response.body.sharedLibs).to.be.an('object');

                expect(response.body.routes).to.deep.include({
                    routeId,
                    domainName,
                    ..._.pick(example.appRoutes, ['route', 'next', 'slots', 'meta']),
                });

                response.body.routes.map((item: Record<string, unknown>) => (
                    item.domainName && expect(item).to.have.property('domainName')
                ));

                response.body.specialRoutes.map((item: Record<string, unknown>) => (
                    item.domainName && expect(item).to.have.property('domainName')
                ));

                expect(response.body.apps[example.apps.name])
                    .deep.equal(
                    _.omit(
                        {
                            ...example.apps,
                            props: example.sharedProps.props
                        },
                        ['name', 'configSelector']
                    )
                );

                expect(response.body.templates).to.include(example.templates.name);
                expect(response.body.settings).to.deep.equal({
                    [SettingKeys.TrailingSlash]: TrailingSlashValues.DoNothing,
                    [SettingKeys.AmdDefineCompatibilityMode]: false,
                    globalSpinner: {
                        enabled: true
                    },
                    i18n: {
                        default: {
                            currency: 'USD',
                            locale: 'en-US',
                        },
                        enabled: true,
                        supported: {
                            currency: ['USD', 'UAH'],
                            locale: ['en-US', 'ua-UA']
                        },
                        routingStrategy: 'prefix_except_default',
                    },
                    [SettingKeys.OnPropsUpdate]: OnPropsUpdateValues.Remount,
                });

                expect(response.body.sharedLibs).include({
                    [example.sharedLibs.name]: example.sharedLibs.spaBundle,
                });
            } finally {}
        });

        it('should prevent to access routes with not allowed domains', async () => {
           try {
               const domain = '127.0.0.1:8080';

               const data = Object.assign({}, example, {
                       routerDomains: {...routerDomains, domainName: domain }
                   }
               );

               await preRequest(data);

               const host = '127.0.0.2:8080' as const;
               const response = await req.get('/api/v1/config')
                   .set('Host', host)
                   .expect(200);

               const {body} = response;

               expect(body?.routes).to.be.an('array');
               expect(body?.specialRoutes).to.be.an('array');

               expect(body.routes.map((route: Record<string, unknown>) => (
                   route.routeId
               ))).to.not.includes(routeIdWithDomain);

               body?.routes.map((route: Record<string, any>) => {
                   const {domainName} = route;
                   expect(route).to.have.property('domainName');
                   expect(domainName).to.be.oneOf(['*'])
                   expect(domainName).to.not.equal(domain);
               });

               body?.specialRoutes.map((route: Record<string, any>) => {
                   const {domainName} = route;
                   expect(route).to.have.property('domainName');
                   expect(domainName).to.be.oneOf(['*'])
                   expect(domainName).to.not.equal(domain);
               });
           } finally {}
        });

        it('should allow access to routes with the same domain', async () => {
            const domainName = '127.0.0.1:8080';

            const data = Object.assign({}, example, {
                    routerDomains: {...routerDomains, domainName }
                }
            );

            await preRequest(data);

            const response = await req.get('/api/v1/config')
                .set('Host', domainName)
                .expect(200);

            const {body} = response;

            expect(body?.routes).to.be.an('array');
            expect(body?.specialRoutes).to.be.an('array');

            expect(body.routes.map((r: Record<string, unknown>) => (
                r.routeId
            ))).includes(routeIdWithDomain);

            body.routes.map((route: Record<string, unknown>) => {
                const {domainName} = route;
                expect(domainName).not.null;
                expect(domainName).not.undefined;
                expect(route).to.have.property('domainName');
                expect(domainName).to.be.oneOf([domainName, '*'])
            });

            body.specialRoutes.map((route: Record<string, any>) => {
                const {domainName} = route;
                expect(domainName).not.null;
                expect(domainName).not.undefined;
                expect(route).to.have.property('domainName');
                expect(domainName).to.be.oneOf([domainName, '*'])
            });
        });

        it('should allow routes resolve on the same domain, but with different ports', async () => {
            const domainName = '127.0.0.1:8080';

            const data = Object.assign({}, example, {
                    routerDomains: {...routerDomains, domainName }
                }
            );

            await preRequest(data);

            const host = '127.0.0.1:3000';
            const response = await req.get('/api/v1/config')
                .set('Host', host)
                .expect(200);

            const {body} = response;

            expect(body?.routes).to.be.an('array');

            expect(body.routes.map(
                (r: Record<string, unknown>) => r.domainName)
            ).includes(domainName)
        });

        describe('Authentication / Authorization', () => {
            it('should be accessible w/o authentication', async () => {
                await reqWithAuth.get('/api/v1/config')
                    .expect(200);
            });
        });
    });
})
