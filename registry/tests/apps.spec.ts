import _ from 'lodash';
import nock from 'nock';
import { type Agent } from 'supertest';
import { expect, request, requestWithAuth } from './common';
import { muteConsole, unmuteConsole } from './utils/console';
import { makeFilterQuery } from './utils/makeFilterQuery';

const assetsDiscovery = {
    host: 'http://127.0.0.1:1234',
    path: '/_spa/dev/assets-discovery',
};

const assetsDiscoveryUrl = assetsDiscovery.host + assetsDiscovery.path;

const correct = Object.freeze({
    name: '@portal/ncTestAppReactssr',
    spaBundle: 'http://localhost:1234/ncTestAppReactssr.js',
    cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssr.css',
    l10nManifest: 'https://localisation.com/manifest.12345678.json',
    configSelector: ['ncTestSharedPropsName'],
    ssr: {
        src: 'http://127.0.0.1:1234/fragment',
        timeout: 1000,
    },
    kind: 'primary',
    // dependencies: {},
    // props: {},
    discoveryMetadata: {
        foo: 'foo1',
        bar: 'bar1',
    },
    adminNotes: 'Lorem ipsum',
});

const appsList = Object.freeze([
    {
        name: 'app0',
        kind: 'primary',
        spaBundle: 'https://app-0.com/spa-bundle.js',
    },
    {
        name: 'app1',
        kind: 'regular',
        spaBundle: 'https://app-1.com/spa-bundle.js',
    },
    {
        name: 'app2',
        kind: 'essential',
        spaBundle: 'https://app-2.com/spa-bundle.js',
    },
]);

const example = {
    encodedName: '',
    url: '/api/v1/app/',
    assetsDiscovery,
    manifest: {
        spaBundle: 'http://127.0.0.1:8239/dist/single_spa.js',
        cssBundle: 'http://127.0.0.1:8239/dist/common.6c686c02a026a4af4016.css',
    },
    correct,
    correctWithAssetsDiscoveryUrl: Object.freeze({
        ...correct,
        assetsDiscoveryUrl,
    }),
    updated: Object.freeze({
        name: '@portal/ncTestAppReactssr',
        spaBundle: 'http://localhost:1234/ncTestAppReactssrUpdated.js',
        cssBundle: 'http://127.0.0.1:1234/ncTestAppReactssrUpdated.css',
        l10nManifest: 'https://localisation.com/manifestUpdated.12345678.json',
        configSelector: ['ncTestSharedPropsNameUpdated'],
        ssr: {
            src: 'http://127.0.0.1:1234/fragmentUpdated',
            timeout: 2000,
        },
        kind: 'regular',
        dependencies: {
            react: 'https://cdnjs.cloudflare.com/ajax/libs/react/16.8.6/umd/react.development.js',
            'react-dom': 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.8.6/umd/react-dom.development.js',
        },
        props: {
            fragmentModuleName: 'reactssr-app-mainUpdated',
            assetsPath: 'http://127.0.0.1:3001/uisamplereactUpdated',
            locationStrategy: 'browserHistoryUpdated',
        },
        discoveryMetadata: {
            foo: 'updated foo1',
            bar: 'updated bar1',
        },
        adminNotes: 'Updated Lorem ipsum',
    }),
    appsList,
};
example.encodedName = encodeURIComponent(example.correct.name);

function expectAppsListEqual(actual: readonly any[], expected: readonly any[]) {
    expect(actual).to.be.an('array').that.is.not.empty;
    expect(actual.map((a) => _.omit(a, 'versionId'))).to.deep.equal(expected);
    for (const app of actual) {
        expect(app.versionId).to.match(/^[0-9]+.[-_0-9a-zA-Z]{32}$/);
    }
}

describe(`Tests ${example.url}`, () => {
    let req: Agent;
    let scope: nock.Interceptor;

    before(() => {
        scope = nock(example.assetsDiscovery.host).persist().get(example.assetsDiscovery.path);
    });

    beforeEach(async () => {
        req = await request();
    });

    after(() => {
        nock.cleanAll();
    });

    describe('Create', () => {
        it('should not create record without a required field: name', async () => {
            const response = await req
                .post(example.url)
                .send(_.omit(example.correct, ['name', 'spaBundle']))
                .expect(422, '"name" is required');
            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of fields', async () => {
            const incorrect = {
                name: 123,
                spaBundle: 456,
                cssBundle: 789,
                configSelector: 654,
                ssr: 456,
                assetsDiscoveryUrl: 789,
                dependencies: 456,
                props: 789,
                discoveryMetadata: 111,
                adminNotes: 222,
                enforceDomain: 'foo',
            };

            let response = await req
                .post(example.url)
                .send({
                    ...example.correct,
                    ...incorrect,
                })
                .expect(422);
            expect(response.text).to.equal(
                '"spaBundle" must be a string\n' +
                    '"cssBundle" must be a string\n' +
                    '"assetsDiscoveryUrl" must be a string\n' +
                    '"dependencies" must be of type object\n' +
                    '"props" must be of type object\n' +
                    '"configSelector" must be an array\n' +
                    '"ssr" must be of type object\n' +
                    '"discoveryMetadata" must be of type object\n' +
                    '"adminNotes" must be a string\n' +
                    '"enforceDomain" must be a number\n' +
                    '"name" must be a string',
            );
            expect(response.body).deep.equal({});

            response = await req.get(example.url + incorrect.name).expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            try {
                let response = await req.post(example.url).send(example.correct).expect(200);

                expect(response.body).deep.equal(example.correct);

                response = await req.get(example.url + example.encodedName).expect(200);

                expect(response.body).deep.equal({ ...example.correct, versionId: response.body.versionId });
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should create record with existed enforceDomain', async () => {
            let domainId;
            const templateName = 'templateName';

            try {
                await req
                    .post('/api/v1/template/')
                    .send({ name: templateName, content: '<html><head></head><body>foo bar</body></html>' })
                    .expect(200);

                const responseRouterDomains = await req
                    .post('/api/v1/router_domains/')
                    .send({ domainName: 'foo.com', template500: templateName })
                    .expect(200);
                domainId = responseRouterDomains.body.id;

                const appConfig = {
                    ...example.correct,
                    enforceDomain: domainId,
                };

                let response = await req.post(example.url).send(appConfig).expect(200);

                expect(response.body).deep.equal(appConfig);

                response = await req.get(example.url + example.encodedName).expect(200);

                expect(response.body).deep.equal({ ...appConfig, versionId: response.body.versionId });
            } finally {
                await req.delete(example.url + example.encodedName);
                domainId && (await req.delete('/api/v1/router_domains/' + domainId));
                await req.delete('/api/v1/template/' + templateName);
            }
        });

        it('should not create record with non-existed enforceDomain', async () => {
            try {
                await req
                    .post(example.url)
                    .send({ ...example.correct, enforceDomain: 9999999 })
                    .expect(500);

                await req.get(example.url + example.encodedName).expect(404);
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should not create a record when a manifest file can not be fetched', async () => {
            muteConsole();

            try {
                scope.reply(404);

                const response = await req
                    .post(example.url)
                    .send(example.correctWithAssetsDiscoveryUrl)
                    .expect(
                        422,
                        `"assetsDiscoveryUrl" ${example.assetsDiscovery.host}${example.assetsDiscovery.path} is not available. Check the url via browser manually.`,
                    );

                expect(response.body).deep.equal({});
            } finally {
                unmuteConsole();
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should not create a record when a SPA bundle URL was not specified in a manifest file', async () => {
            try {
                scope.reply(200, JSON.stringify({}));

                const response = await req
                    .post(example.url)
                    .send(example.correctWithAssetsDiscoveryUrl)
                    .expect(422, `"spaBundle" is required`);

                expect(response.body).deep.equal({});
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should create a record when a SPA bundle URL was specified in a manifest file', async () => {
            try {
                scope.reply(200, JSON.stringify(example.manifest));

                const response = await req.post(example.url).send(example.correctWithAssetsDiscoveryUrl).expect(200);
                expect(response.body).deep.equal({
                    ...example.correctWithAssetsDiscoveryUrl,
                    ...example.manifest,
                });
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should create an app when both spaBundle and assetsDiscovery are NOT specified', async () => {
            try {
                const ssrOnlyApp = _.omit(example.correct, ['spaBundle', 'cssBundle']);
                const response = await req.post(example.url).send(ssrOnlyApp).expect(200);
                expect(response.body).to.deep.equal(ssrOnlyApp);
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) => r.post(example.url).send(example.correct).expect(401));
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            const incorrect = { name: 123 };
            const response = await req.get(example.url + incorrect.name).expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record', async () => {
            try {
                await req.post(example.url).send(example.correct);

                const response = await req.get(example.url + example.encodedName).expect(200);

                expect(response.body.versionId).to.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);
                expect(response.body).deep.equal({ ...example.correct, versionId: response.body.versionId });
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should successfully return all existing records', async () => {
            try {
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }

                const response = await req.get(example.url).expect(200);

                expectAppsListEqual(response.body, example.appsList);
            } finally {
                for (const app of example.appsList) {
                    await req.delete(example.url + app.name);
                }
            }
        });

        it('should successfully return records filtered by name', async () => {
            try {
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }

                const query = makeFilterQuery({ q: example.appsList[1].name });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                expectAppsListEqual(response.body, [example.appsList[1]]);
            } finally {
                for (const app of example.appsList) {
                    await req.delete(example.url + app.name);
                }
            }
        });

        it('should successfully return records filtered by kind', async () => {
            try {
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }

                const query = makeFilterQuery({ kind: 'primary' });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                expectAppsListEqual(response.body, [example.appsList[0]]);
            } finally {
                for (const app of example.appsList) {
                    await req.delete(example.url + app.name);
                }
            }
        });

        it('should successfully return records filtered by domainID using slots and routes', async () => {
            const teardownFns: (() => Promise<void>)[] = [];

            try {
                // create apps
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }
                teardownFns.unshift(async () => {
                    for (const app of example.appsList) {
                        await req.delete(example.url + app.name).expect(204);
                    }
                });

                //create template
                const template = {
                    name: 'hello500',
                    content: '<html><head></head><body class="custom">hello500</body></html>',
                };
                await req.post('/api/v1/template').send(template).expect(200);
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/template/' + template.name).expect(204);
                });

                //create domain with this template
                const domain = { domainName: 'example.com', template500: template.name };
                const {
                    body: { id: routerDomainId },
                } = await req.post('/api/v1/router_domains').send(domain).expect(200);
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/router_domains/' + routerDomainId).expect(204);
                });

                //create route with this domain, where one of the apps will be rendered as a slot
                const route = {
                    next: false,
                    slots: { myslot: { appName: example.appsList[1].name, kind: 'primary' } },
                    route: 'myroute',
                    domainId: routerDomainId,
                };
                const {
                    body: { id: routeId },
                } = await req.post('/api/v1/route').send(route).expect(200);
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/route/' + routeId).expect(204);
                });

                const query = makeFilterQuery({ domainId: routerDomainId });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                expectAppsListEqual(response.body, [example.appsList[1]]);
            } finally {
                for (const fn of teardownFns) {
                    await fn();
                }
            }
        });

        it('should successfully return records filtered by domainId, using enforceDomain', async () => {
            const teardownFns: (() => Promise<void>)[] = [];
            try {
                //create template
                const template = {
                    name: 'hello500',
                    content: '<html><head></head><body class="custom">hello500</body></html>',
                };
                await req.post('/api/v1/template').send(template).expect(200);
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/template/' + template.name).expect(204);
                });

                //create domain with this template
                const domain = { domainName: 'example.com', template500: template.name };
                const {
                    body: { id: routerDomainId },
                } = await req.post('/api/v1/router_domains').send(domain).expect(200);
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/router_domains/' + routerDomainId).expect(204);
                });

                // create apps, adding a routerDomainId as enforceDomain to one of them
                const app1WithDomain = {
                    ...example.appsList[1],
                    enforceDomain: routerDomainId,
                };
                const apps = [example.appsList[0], app1WithDomain, example.appsList[2]];
                for (const app of apps) {
                    await req.post(example.url).send(app).expect(200);
                }
                teardownFns.unshift(async () => {
                    for (const app of apps) {
                        await req.delete(example.url + app.name).expect(204);
                    }
                });

                const query = makeFilterQuery({ domainId: routerDomainId });
                const response = await req.get(`${example.url}?${query}`).expect(200);
                expectAppsListEqual(response.body, [app1WithDomain]);
            } finally {
                for (const fn of teardownFns) {
                    await fn();
                }
            }
        });

        it('should successfully return records filtered by domainId="null" (apps not used in domain-specific routes)', async () => {
            const teardownFns: (() => Promise<void>)[] = [];
            try {
                // create apps
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }
                teardownFns.unshift(async () => {
                    for (const app of example.appsList) {
                        await req.delete(example.url + app.name).expect(204);
                    }
                });

                //create template
                const template = {
                    name: 'hello500',
                    content: '<html><head></head><body class="custom">hello500</body></html>',
                };
                await req.post('/api/v1/template').send(template).expect(200);
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/template/' + template.name).expect(204);
                });

                //create domain with this template
                const domain = { domainName: 'example.com', template500: template.name };
                const {
                    body: { id: routerDomainId },
                } = await req.post('/api/v1/router_domains').send(domain).expect(200);
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/router_domains/' + routerDomainId).expect(204);
                });

                //create route with this domain, where one of the apps will be rendered as a slot
                const route = {
                    next: false,
                    slots: { myslot: { appName: example.appsList[1].name, kind: 'primary' } },
                    route: 'myroute',
                    domainId: routerDomainId,
                };
                const {
                    body: { id: routeId },
                } = await req.post('/api/v1/route').send(route).expect(200);
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/route/' + routeId).expect(204);
                });

                // Filter by domainId="null" should return apps NOT used in any domain-specific routes
                // In this case, app0 and app2 are not used in domain-specific routes
                const query = makeFilterQuery({ domainId: 'null' });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                expectAppsListEqual(response.body, [example.appsList[0], example.appsList[2]]);
            } finally {
                for (const fn of teardownFns) {
                    await fn();
                }
            }
        });

        it('should successfully return records with multiple filters (kind + name)', async () => {
            try {
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }

                // Filter by kind='regular' and name search for 'app1'
                const query = makeFilterQuery({ kind: 'regular', q: 'app1' });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                expectAppsListEqual(response.body, [example.appsList[1]]);
            } finally {
                for (const app of example.appsList) {
                    await req.delete(example.url + app.name);
                }
            }
        });

        it('should successfully filter by name array (single name)', async () => {
            try {
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }

                const query = makeFilterQuery({ name: [example.appsList[1].name] });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                expectAppsListEqual(response.body, [example.appsList[1]]);
            } finally {
                for (const app of example.appsList) {
                    await req.delete(example.url + app.name);
                }
            }
        });

        it('should successfully filter by name array (multiple names)', async () => {
            try {
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }

                const query = makeFilterQuery({ name: [example.appsList[0].name, example.appsList[2].name] });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                expectAppsListEqual(response.body, [example.appsList[0], example.appsList[2]]);
            } finally {
                for (const app of example.appsList) {
                    await req.delete(example.url + app.name);
                }
            }
        });

        it('should successfully filter by id array (single id)', async () => {
            try {
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }

                // id is actually the app name in this API
                const query = makeFilterQuery({ id: [example.appsList[0].name] });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                expectAppsListEqual(response.body, [example.appsList[0]]);
            } finally {
                for (const app of example.appsList) {
                    await req.delete(example.url + app.name);
                }
            }
        });

        it('should successfully filter by id array (multiple ids)', async () => {
            try {
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }

                // id is actually the app name in this API
                const query = makeFilterQuery({ id: [example.appsList[1].name, example.appsList[2].name] });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                expectAppsListEqual(response.body, [example.appsList[1], example.appsList[2]]);
            } finally {
                for (const app of example.appsList) {
                    await req.delete(example.url + app.name);
                }
            }
        });

        it('should prioritize id filter over name filter when both are provided', async () => {
            try {
                for (const app of example.appsList) {
                    await req.post(example.url).send(app).expect(200);
                }

                // When both id and name are provided, id should take precedence
                const query = makeFilterQuery({
                    id: [example.appsList[0].name],
                    name: [example.appsList[1].name],
                });
                const response = await req.get(`${example.url}?${query}`).expect(200);

                // Should return app0, not app1, because id takes precedence
                expectAppsListEqual(response.body, [example.appsList[0]]);
            } finally {
                for (const app of example.appsList) {
                    await req.delete(example.url + app.name);
                }
            }
        });

        it('should return 400 for invalid filter format', async () => {
            // Test invalid domainId (should be number or "null", not a random string)
            const invalidQuery = makeFilterQuery({ domainId: 'invalid-value' });
            const response = await req.get(`${example.url}?${invalidQuery}`).expect(400);

            expect(response.body).to.have.property('error');
            expect(response.body.error).to.be.a('string');
            expect(response.body.error).to.equal('"domainId" must be one of [number, null]');
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) => r.get(example.url).expect(401));

                await requestWithAuth().then((r) => r.get(example.url + 123).expect(401));
            });
        });
    });

    describe('Update', () => {
        it("should not update any record if record doesn't exist", async () => {
            const incorrect = { name: 123 };
            const response = await req
                .put(example.url + incorrect.name)
                .expect(404, `Application with name "${incorrect.name}" is not exist`);

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                const response = await req
                    .put(example.url + example.encodedName)
                    .send(example.updated)
                    .expect(422, '"name" is not allowed');

                expect(response.body).deep.equal({});
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should not update record with incorrect type of fields', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                const incorrect = {
                    spaBundle: 456,
                    cssBundle: 789,
                    configSelector: 654,
                    ssr: 456,
                    assetsDiscoveryUrl: 789,
                    dependencies: 456,
                    props: 789,
                    kind: 'origin',
                    discoveryMetadata: 111,
                    adminNotes: 222,
                    enforceDomain: 'foo',
                };

                const response = await req
                    .put(example.url + example.encodedName)
                    .send({
                        ..._.omit(example.updated, 'name'),
                        ...incorrect,
                    })
                    .expect(
                        422,
                        '"spaBundle" must be a string\n' +
                            '"cssBundle" must be a string\n' +
                            '"assetsDiscoveryUrl" must be a string\n' +
                            '"dependencies" must be of type object\n' +
                            '"props" must be of type object\n' +
                            '"configSelector" must be an array\n' +
                            '"ssr" must be of type object\n' +
                            '"kind" must be one of [primary, essential, regular, wrapper]\n' +
                            '"discoveryMetadata" must be of type object\n' +
                            '"adminNotes" must be a string\n' +
                            '"enforceDomain" must be a number',
                    );
                expect(response.body).deep.equal({});
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should successfully update record', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                const response = await req
                    .put(example.url + example.encodedName)
                    .send(_.omit(example.updated, 'name'))
                    .expect(200);

                expect(response.body).deep.equal(example.updated);
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should successfully set namespace to null if it was set before', async () => {
            try {
                const { body: created } = await req
                    .post(example.url)
                    .send({ ...example.correct, namespace: 'ns1' })
                    .expect(200);
                expect(created.namespace).to.equal('ns1');

                const { body: updated } = await req
                    .put(example.url + example.encodedName)
                    .send({ ..._.omit(example.correct, 'name'), namespace: null })
                    .expect(200);

                expect(updated.namespace).equal(undefined);
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should successfully update record with enforceDomain', async () => {
            let domainId;
            const templateName = 'templateName';

            try {
                await req
                    .post('/api/v1/template/')
                    .send({ name: templateName, content: '<html><head></head><body>foo bar</body></html>' })
                    .expect(200);

                const responseRouterDomains = await req
                    .post('/api/v1/router_domains/')
                    .send({ domainName: 'foo.com', template500: templateName })
                    .expect(200);
                domainId = responseRouterDomains.body.id;

                await req.post(example.url).send(example.correct).expect(200);

                const response = await req
                    .put(example.url + example.encodedName)
                    .send({
                        ..._.omit(example.updated, 'name'),
                        enforceDomain: domainId,
                    })
                    .expect(200);

                expect(response.body).deep.equal({
                    ...example.updated,
                    enforceDomain: domainId,
                });
            } finally {
                await req.delete(example.url + example.encodedName);
                domainId && (await req.delete('/api/v1/router_domains/' + domainId));
                await req.delete('/api/v1/template/' + templateName);
            }
        });

        it('should be possible to remove\reset fields valued during update', async () => {
            let domainId;
            const templateName = 'templateName';

            try {
                await req
                    .post('/api/v1/template/')
                    .send({ name: templateName, content: '<html><head></head><body>foo bar</body></html>' })
                    .expect(200);

                const responseRouterDomains = await req
                    .post('/api/v1/router_domains/')
                    .send({ domainName: 'foo.com', template500: templateName })
                    .expect(200);
                domainId = responseRouterDomains.body.id;

                const createAppWithEnforcedDomain = {
                    ...example.correct,
                    enforceDomain: domainId,
                };

                const updateAppDropedEnforcedDomain = {
                    ..._.omit(example.updated, 'name'),
                    enforceDomain: null,
                };

                await req.post(example.url).send(createAppWithEnforcedDomain).expect(200);

                const response = await req
                    .put(example.url + example.encodedName)
                    .send(updateAppDropedEnforcedDomain)
                    .expect(200);

                expect(response.body).deep.equal(
                    {
                        ...example.updated,
                    },
                    'Update should remove enforceDomain field',
                );
            } finally {
                await req.delete(example.url + example.encodedName);
                domainId && (await req.delete('/api/v1/router_domains/' + domainId));
                await req.delete('/api/v1/template/' + templateName);
            }
        });

        it('should not update record with non-existed enforceDomain', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                await req
                    .put(example.url + example.encodedName)
                    .send({
                        ..._.omit(example.updated, 'name'),
                        enforceDomain: 999999,
                    })
                    .expect(500);
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should not update a record when a manifest file can not be fetched', async () => {
            muteConsole();

            try {
                await req.post(example.url).send(example.correct).expect(200);

                scope.reply(404);

                const response = await req
                    .put(example.url + example.encodedName)
                    .send(_.omit(example.correctWithAssetsDiscoveryUrl, 'name'))
                    .expect(
                        422,
                        `"assetsDiscoveryUrl" ${example.assetsDiscovery.host}${example.assetsDiscovery.path} is not available. Check the url via browser manually.`,
                    );

                expect(response.body).deep.equal({});
            } finally {
                unmuteConsole();
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should not update a record when a SPA bundle URL was not specified in a manifest file', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                scope.reply(200, JSON.stringify({}));

                const response = await req
                    .put(example.url + example.encodedName)
                    .send(_.omit(example.correctWithAssetsDiscoveryUrl, 'name'))
                    .expect(422, `"spaBundle" is required`);

                expect(response.body).deep.equal({});
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        it('should update a record when a SPA bundle URL was specified in a manifest file', async () => {
            try {
                await req.post(example.url).send(example.correct).expect(200);

                scope.reply(200, JSON.stringify(example.manifest));

                const response = await req
                    .put(example.url + example.encodedName)
                    .send(_.omit(example.correctWithAssetsDiscoveryUrl, 'name'));

                expect(response.body).deep.equal({
                    ...example.correctWithAssetsDiscoveryUrl,
                    ...example.manifest,
                });
            } finally {
                await req.delete(example.url + example.encodedName);
            }
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) =>
                    r
                        .put(example.url + 123)
                        .send(example.correct)
                        .expect(401),
                );
            });
        });
    });

    describe('Delete', () => {
        it("should not delete any record if record doesn't exist", async () => {
            const incorrect = { name: 123 };
            const response = await req
                .delete(example.url + encodeURIComponent(incorrect.name))
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req.delete(example.url + example.encodedName).expect(204, '');

            expect(response.body).deep.equal({});
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth().then((r) =>
                    r
                        .delete(example.url + 123)
                        .send(example.correct)
                        .expect(401),
                );
            });
        });
    });
});
