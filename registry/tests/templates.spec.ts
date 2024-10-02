import _ from 'lodash';
import nock from 'nock';
import supertest, { type Agent } from 'supertest';
import app from '../server/app';
import { expect, getServerAddress } from './common';
import { SettingKeys } from '../server/settings/interfaces';
import { withSetting } from './utils/withSetting';
import { makeFilterQuery } from './utils/makeFilterQuery';

const example = {
    url: '/api/v1/template/',
    correct: Object.freeze({
        name: 'ncTestTemplateName',
        content: '<html><head></head><body class="custom">ncTestTemplateContent</body></html>',
    }),
    invalid: Object.freeze({
        name: 'ncTestTemplateNameInvalid',
        content: '<html><body>ncTestTemplateContent</body></html>',
    }),
    correctLocalized: Object.freeze({
        name: 'localizedTestTemplate' + Math.random() * 10000,
        content: '<html><head></head><body>test content</body></html>',
        localizedVersions: {
            'es-MX': { content: '<html><head></head><body>Espaniol content</body></html>' },
            'fr-FR': { content: '<html><head></head><body>French content</body></html>' },
        },
    }),
    updated: Object.freeze({
        name: 'ncTestTemplateName',
        content: '<html><head></head><body>ncTestTemplateContentUpdated</body></html>',
    }),
    updatedLocalized: Object.freeze({
        content: '<html><head></head><body>test content</body></html>',
        localizedVersions: {
            'fr-FR': { content: '<html><head></head><body>French superior content</body></html>' },
            'fr-CA': { content: '<html><head></head><body>Canada content</body></html>' },
        },
    }),
    withInclude: Object.freeze({
        name: 'ncTestTemplateNameWithInclude',
        content:
            '<html><head></head><body><include id="test-include" src="https://complete-random-ilc-include-test-domain.org.ote/include.html" timeout="100" />' +
            'test content</body></html>',
    }),

    templatesList: [
        {
            name: 'template0',
            content: '<html><head></head><body>template0</body></html>',
        },
        {
            name: 'template1',
            content: '<html><head></head><body>template1</body></html>',
        },
        {
            name: 'template2',
            content: '<html><head></head><body>template2</body></html>',
        },
    ],
};

describe(`Tests ${example.url}`, () => {
    let req: Agent;
    let reqWithAuth: Agent;
    let reqAddress = '';

    beforeEach(async () => {
        const appInstance = await app(false);
        const appWithAuthInstance = await app(true);

        const appServer = appInstance.listen(0);
        const appWithAuthServer = appWithAuthInstance.listen(0);

        reqAddress = getServerAddress(appServer);
        req = supertest(appServer);
        reqWithAuth = supertest(appWithAuthServer);
    });

    afterEach(async () => {
        await req.delete(example.url + example.correctLocalized.name);
        await req.delete(example.url + example.correct.name);
    });

    describe('Create', () => {
        it('should not create record without a required field: name', async () => {
            const response = await req
                .post(example.url)
                .send(_.omit(example.correct, 'name'))
                .expect(422, '"name" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: content', async () => {
            const response = await req
                .post(example.url)
                .send(_.omit(example.correct, 'content'))
                .expect(422, '"content" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: name', async () => {
            const incorrect = {
                name: 123,
                content: 456,
            };

            let response = await req
                .post(example.url)
                .send(incorrect)
                .expect(422, '"content" must be a string\n"name" must be a string');

            expect(response.body).deep.equal({});

            response = await req.get(example.url + incorrect.name).expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await req.post(example.url).send(example.correct).expect(200);

            let createdTemplate = { ...example.correct, localizedVersions: {} };

            expect(response.body.versionId).to.match(/^[0-9]+.[-_0-9a-zA-Z]{32}$/);
            expect(response.body).deep.equal({ ...createdTemplate, versionId: response.body.versionId });

            response = await req.get(example.url + example.correct.name).expect(200);

            expect(response.body).deep.equal({ ...createdTemplate, versionId: response.body.versionId });
        });

        it('should create localized versions of template', async () => {
            await withSetting(
                SettingKeys.I18nSupportedLocales,
                Object.keys(example.correctLocalized.localizedVersions),
                async () => {
                    let response = await req.post(example.url).send(example.correctLocalized);
                    expect(response.status).to.eq(200, response.text);
                },
            );
        });

        it('should not accept not supported languages', async () => {
            await withSetting(SettingKeys.I18nSupportedLocales, ['es-MX', 'ch-CH'], async () => {
                let response = await req.post(example.url).send(example.correctLocalized);
                expect(response.status).to.eq(422, response.text);
                expect(response.text).to.contain('locales are not supported');
            });
        });

        it('should not create record with invalid template structure', async () => {
            await req.post(example.url).send(example.invalid).expect(422, 'HTML template has invalid structure');
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.post(example.url).send(example.correct).expect(401);
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            const incorrect = { name: 123 };
            const response = await req.get(example.url + incorrect.name).expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record w/o authentication', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await reqWithAuth.get(example.url + example.correct.name).expect(200);

            expect(response.body).deep.equal({
                ...example.correct,
                localizedVersions: {},
                versionId: response.body.versionId,
            });
        });

        it('should return localized versions of the template', async () => {
            await withSetting(
                SettingKeys.I18nSupportedLocales,
                Object.keys(example.correctLocalized.localizedVersions),
                async () => {
                    await req.post(example.url).send(example.correctLocalized).expect(200);
                },
            );

            const response = await reqWithAuth.get(example.url + example.correctLocalized.name).expect(200);

            expect(response.body).deep.equal({ ...example.correctLocalized, versionId: response.body.versionId });
        });

        it('should return localized version of rendered template', async () => {
            await withSetting(
                SettingKeys.I18nSupportedLocales,
                Object.keys(example.correctLocalized.localizedVersions),
                async () => {
                    await req.post(example.url).send(example.correctLocalized).expect(200);
                },
            );

            const response = await req.get(example.url + example.correctLocalized.name + '/rendered?locale=' + 'es-MX');

            expect(response.status).to.eq(200, JSON.stringify(response.body));
            expect(response.body.content).to.eq(example.correctLocalized.localizedVersions['es-MX'].content);
        });

        it('should return 404 while requesting a non-existent rendered template', async () => {
            const incorrect = { name: 123 };
            const response = await req.get(example.url + incorrect.name + '/rendered').expect(404, 'Not found');

            expect(response.body).to.eql({});
        });

        it('should successfully return all existed records', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req.get(example.url).expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include({ ...example.correct, versionId: response.body[0].versionId });
            expect(response.body[0].versionId).to.match(/^[0-9]+.[-_0-9a-zA-Z]{32}$/);
        });

        describe('filter by name', () => {
            const testCases = [
                {
                    title: 'name',
                    filter: { name: example.templatesList[1].name },
                },
                {
                    title: 'id',
                    filter: { id: example.templatesList[1].name },
                },
                {
                    title: 'name[]',
                    filter: { name: [example.templatesList[1].name] },
                },
                {
                    title: 'id[]',
                    filter: { id: [example.templatesList[1].name] },
                },
            ];

            for (const testCase of testCases) {
                it(`should filter a list of templates by name represented by ${testCase.title}`, async () => {
                    try {
                        // Create a list of templates
                        for (const template of example.templatesList) {
                            await req.post(example.url).send(template).expect(200);
                        }

                        // Get the list of templates
                        const query = makeFilterQuery({ name: example.templatesList[1].name });
                        const response = await req.get(`${example.url}?${query}`).expect(200);
                        expect(response.body).to.be.an('array').that.is.not.empty;
                        expect(response.body).to.have.length(1);
                        expect(response.body).to.deep.include({
                            ...example.templatesList[1],
                            versionId: response.body[0].versionId,
                        });
                    } finally {
                        for (const template of example.templatesList) {
                            await req.delete(example.url + template.name).expect(204);
                        }
                    }
                });
            }
        });

        it('should filter a list of templates by domainId', async () => {
            const teardownFns: (() => Promise<void>)[] = [];

            try {
                // Create a list of templates
                for (const template of example.templatesList) {
                    await req.post(example.url).send(template).expect(200);
                }
                teardownFns.unshift(async () => {
                    for (const template of example.templatesList) {
                        await req.delete(example.url + template.name).expect(204);
                    }
                });

                // Create a domain
                const domainResponse = await req
                    .post('/api/v1/router_domains')
                    .send({
                        domainName: 'example.com',
                        template500: example.templatesList[1].name,
                    })
                    .expect(200);
                const domainId = domainResponse.body.id;
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/router_domains/' + domainId).expect(204);
                });

                // Create a route
                const routeResponse = await req.post('/api/v1/route').send({
                    route: 'example',
                    domainId,
                    templateName: example.templatesList[2].name,
                });
                const routeId = routeResponse.body.id;
                teardownFns.unshift(async () => {
                    await req.delete('/api/v1/route/' + routeId).expect(204);
                });

                // Get the list of templates by domain
                const { body: templatesWithDomain } = await req
                    .get(`${example.url}?${makeFilterQuery({ domainId })}`)
                    .expect(200);
                expect(templatesWithDomain).to.be.an('array').that.is.not.empty;
                // There should be two templates:
                expect(templatesWithDomain).to.have.length(2);
                // One of the templates should be from the domain
                expect(_.omit(templatesWithDomain[0], 'versionId')).to.deep.equal({
                    ...example.templatesList[1],
                });
                // The other template should be from the route
                expect(_.omit(templatesWithDomain[1], 'versionId')).to.deep.equal({
                    ...example.templatesList[2],
                });

                // Get the list of templates without domain
                const { body: templatesWithoutDomain } = await req
                    .get(`${example.url}?${makeFilterQuery({ domainId: 'null' })}`)
                    .expect(200);
                expect(templatesWithoutDomain).to.be.an('array').that.is.not.empty;
                // There should be one template:
                expect(templatesWithoutDomain).to.have.length(1);
                // The template not associated with the any domain
                expect(_.omit(templatesWithoutDomain[0], 'versionId')).to.deep.equal({
                    ...example.templatesList[0],
                });
            } finally {
                for (const fn of teardownFns) {
                    await fn();
                }
            }
        });

        describe('template with domain', () => {
            let domainId: string;
            let routeId: string;

            let example = <any>{
                app: {
                    url: '/api/v1/app/',
                    correct: {
                        name: '@portal/ncTestAppName1',
                        spaBundle: 'http://localhost:1234/ncTestAppName.js',
                        kind: 'primary',
                    },
                },
                template: {
                    url: '/api/v1/template/',
                    correct: {
                        name: 'ncTestTemplateDomainName',
                        content: '<html><head></head><body>ncTestTemplateContent</body></html>',
                    },
                    noRoute: {
                        name: 'ncTestNoRouteTemplateName',
                        content: '<html><head></head><body>ncTestTemplateContent</body></html>',
                    },
                    template500: {
                        name: 'ncTest500TemplateName',
                        content: '<html><head></head><body>ncTestTemplateContent</body></html>',
                    },
                },
                routerDomain: {
                    url: '/api/v1/router_domains/',
                    correct: {
                        domainName: '',
                        template500: '<html><head></head><body>ncTest500TemplateName</body></html>',
                    },
                },
            };

            example = {
                ...example,
                route: {
                    url: '/api/v1/route/',
                    correct: Object.freeze({
                        specialRole: undefined,
                        orderPos: 122,
                        route: '/ncTestRoute/*',
                        next: false,
                        templateName: example.template.correct.name,
                        slots: {
                            ncTestRouteSlotName: {
                                appName: example.app.correct.name,
                                props: { ncTestProp: 1 },
                                kind: 'regular',
                            },
                        },
                    }),
                },
            };

            beforeEach(async () => {
                await req.post(example.app.url).send(example.app.correct).expect(200);
                await req.post(example.template.url).send(example.template.template500);

                const routerDomainResponse = await req.post(example.routerDomain.url).send({
                    ...example.routerDomain.correct,
                    domainName: reqAddress,
                });

                const { id: domainId } = routerDomainResponse.body;

                await req.post(example.template.url).send(example.template.correct);
                await req.post(example.template.url).send(example.template.noRoute);

                const routeResponse = await req
                    .post(example.route.url)
                    .send({
                        ...example.route.correct,
                        domainId,
                    })
                    .expect(200);

                routeId = routeResponse.body.id;
            });

            afterEach(async () => {
                domainId && (await req.delete(example.routerDomain.url + domainId));
                routeId && (await req.delete(example.route.url + routeId));

                await req.delete(example.app.url + encodeURIComponent(example.app.correct.name));
                await req.delete(example.template.url + example.template.correct.name);
                await req.delete(example.template.url + example.template.noRoute.name);
                await req.delete(example.template.url + example.template.template500.name);
            });

            it('Should return template for given domain', async () => {
                const templateResponse = await req.get(
                    example.template.url + example.template.correct.name + '/rendered',
                );
                const templateWithDomainResponse = await req.get(
                    example.template.url +
                        example.template.correct.name +
                        '/rendered?locale=' +
                        'es-MX' +
                        '&domain=' +
                        reqAddress,
                );

                expect(templateResponse.body).to.deep.equal(templateWithDomainResponse.body);
            });

            it('Should return template by name if no given domain found', async () => {
                const templateResponse = await req.get(
                    example.template.url + example.template.correct.name + '/rendered',
                );
                const templateWithDomainResponse = await req.get(
                    example.template.url +
                        example.template.correct.name +
                        '/rendered?locale=' +
                        'es-MX' +
                        '&domain=128.0.0.1',
                );

                expect(templateResponse.body).to.deep.equal(templateWithDomainResponse.body);
            });
        });
    });

    describe('Update', () => {
        it("should not update any record if record doesn't exist", async () => {
            const incorrect = { name: 123 };
            const response = await req.put(example.url + incorrect.name).expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req
                .put(example.url + example.correct.name)
                .send(example.updated)
                .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: content', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const incorrect = {
                name: 123,
                content: 456,
            };

            const response = await req
                .put(example.url + example.correct.name)
                .send(_.omit(incorrect, 'name'))
                .expect(422, '"content" must be a string');
            expect(response.body).deep.equal({});
        });

        it('should not update record with invalid template structure', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            await req
                .put(example.url + example.invalid.name)
                .send(_.omit(example.invalid, 'name'))
                .expect(422, 'HTML template has invalid structure');
        });

        it('should not update record with unsupported locale', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            await req
                .put(example.url + example.correct.name)
                .send({
                    content: example.correct.content,
                    localizedVersions: {
                        'zh-CN': { content: example.correct.content },
                    },
                })
                .expect(
                    422,
                    'Next locales are not supported zh-CN. Either change request or change i18n.supported.locale setting.',
                );
        });

        it('should successfully update record', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req
                .put(example.url + example.correct.name)
                .send(_.omit(example.updated, 'name'))
                .expect(200);

            expect(response.body).deep.equal({
                ...example.updated,
                localizedVersions: {},
                versionId: response.body.versionId,
            });
        });

        it('should successfully update localized versions of the template', async () => {
            let allLangs = Object.keys(example.correctLocalized.localizedVersions).concat(
                Object.keys(example.updatedLocalized.localizedVersions),
            );
            await withSetting(SettingKeys.I18nSupportedLocales, allLangs, async () => {
                await req.post(example.url).send(example.correctLocalized).expect(200);

                const response = await req
                    .put(example.url + example.correctLocalized.name)
                    .send(_.omit(example.updatedLocalized, 'name'))
                    .expect(200);

                expect(response.body).deep.equal({
                    name: example.correctLocalized.name,
                    ...example.updatedLocalized,
                    versionId: response.body.versionId,
                });
            });
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth
                    .put(example.url + example.correct.name)
                    .send(_.omit(example.updated, 'name'))
                    .expect(401);
            });
        });
    });

    describe('Delete', () => {
        it("should not delete any record if record doesn't exist", async () => {
            const incorrect = { name: 123 };
            const response = await req.delete(example.url + incorrect.name).expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it("should successfully delete record if doesn't have any reference from foreign (routerDomains -> template500) to current primary key", async () => {
            let routerDomainsId;

            try {
                await req.post(example.url).send(example.correct).expect(200);

                const responseRouterDomains = await req
                    .post('/api/v1/router_domains/')
                    .send({
                        domainName: 'domainNameCorrect.com',
                        template500: example.correct.name,
                    })
                    .expect(200);

                routerDomainsId = responseRouterDomains.body.id;

                const response = await req.delete(example.url + example.correct.name).expect(500);
                expect(response.text).to.include('Internal server error occurred.');

                await req.delete('/api/v1/router_domains/' + routerDomainsId);

                await req.delete(example.url + example.correct.name).expect(204, '');

                await req.get(example.url + example.correct.name).expect(404, 'Not found');
            } finally {
                routerDomainsId && (await req.delete('/api/v1/router_domains/' + routerDomainsId));
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should successfully delete record', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req.delete(example.url + example.correct.name).expect(204, '');

            expect(response.body).deep.equal({});
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.delete(example.url + example.correct.name).expect(401);
            });
        });
    });

    describe('Rendered', () => {
        it('should return HTTP 500 in case of inability to render template', async () => {
            const setupIncludeResults = (delay: number) =>
                nock('https://complete-random-ilc-include-test-domain.org.ote')
                    .get('/include.html')
                    .delay(delay)
                    .reply(200, '<div>test content</div>');
            setupIncludeResults(10);
            const creationResponse = await req.post(example.url).send(example.withInclude);
            try {
                expect(creationResponse.status).to.eq(200, creationResponse.text);
                setupIncludeResults(1000); // should be bigger than timeout in HTML
                const templateResponse = await req.get(example.url + example.withInclude.name + '/rendered');

                expect(templateResponse.statusCode).to.equal(500);
            } finally {
                await req.delete(example.url + example.withInclude.name);
            }
        });

        it('should return a rendered template w/o authentication', async () => {
            const includesHost = 'https://api.include.com';
            const scope = nock(includesHost);

            const includes = [
                {
                    api: {
                        route: '/get/include/1',
                        delay: 0,
                        response: {
                            status: 200,
                            data: `
                                <div id="include-id-1">
                                    This include has all necessary attributes
                                    and a specified link header which is a stylesheet
                                </div>
                            `,
                            headers: {
                                'X-Powered-By': 'JS',
                                'X-My-Awesome-Header': 'Awesome',
                                Link: 'https://my.awesome.server/my-awesome-stylesheet.css;rel=stylesheet;loveyou=3000,https://my.awesome.server/my-awesome-script.js;rel=script;loveyou=3000',
                            },
                        },
                    },
                    attributes: {
                        id: 'include-id-1',
                        src: `${includesHost}/get/include/1`,
                        timeout: 1000,
                    },
                },
            ];

            const template = {
                name: 'This template is for a render test',
                content: `
                    <html>
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width,initial-scale=1"/>
                        <include    id="${includes[0].attributes.id}"   src="${includes[0].attributes.src}"    timeout="${includes[0].attributes.timeout}" />
                        <script>window.console.log('Something...')</script>
                    </head>
                    <body>
                        <div class="class-name-1">Something...</div>
                        <div id="div-id-1" class="class-name-2">Something...</div>
                        <div id="div-id-2" data-id="data-id-2" />
                    </body>
                    </html>
                `,
            };

            includes.forEach(
                ({
                    api: {
                        route,
                        delay,
                        response: { status, data, headers },
                    },
                }) => scope.persist().get(route).delay(delay).reply(status, data, headers),
            );

            try {
                await req.post(example.url).send(template).expect(200);

                const response = await reqWithAuth.get(example.url + template.name + '/rendered').expect(200);

                const versionId = response.body.versionId;

                expect(versionId).to.match(/^\d+\.[-_0-9a-zA-Z]{32}$/);

                expect(response.body).to.eql({
                    styleRefs: ['https://my.awesome.server/my-awesome-stylesheet.css'],
                    name: template.name,
                    versionId: versionId,
                    content: `
                    <html>
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width,initial-scale=1"/>
                        ${
                            `<!-- Template include "${includes[0].attributes.id}" START -->\n` +
                            '<link rel="stylesheet" href="https://my.awesome.server/my-awesome-stylesheet.css">\n' +
                            includes[0].api.response.data +
                            '\n' +
                            '<script src="https://my.awesome.server/my-awesome-script.js"></script>\n' +
                            `<!-- Template include "${includes[0].attributes.id}" END -->`
                        }
                        <script>window.console.log('Something...')</script>
                    </head>
                    <body>
                        <div class="class-name-1">Something...</div>
                        <div id="div-id-1" class="class-name-2">Something...</div>
                        <div id="div-id-2" data-id="data-id-2" />
                    </body>
                    </html>
                `,
                });
            } finally {
                await req.delete(example.url + template.name);
            }
        });

        it('should return a rendered template for a specific domain', async () => {
            const domain = 'test-domain-123.com.ote';
            const content = '<html><head></head><body>test-domain-123</body></html>';
            const contentUpdated = '<html><head></head><body>test-domain-123 updated</body></html>';
            const template = { name: 'template-for-test-domain-123', content: content };
            let routerDomainId = 0;
            let routeId = 0;

            try {
                await req.post(example.url).send(template).expect(200);
                await req
                    .put(example.url + template.name)
                    .send({ content: contentUpdated, localizedVersions: {} })
                    .expect(200);

                const postRouterDomainsResponse = await req
                    .post('/api/v1/router_domains')
                    .send({ domainName: domain, template500: template.name })
                    .expect(200);
                routerDomainId = postRouterDomainsResponse.body.id;

                const postRouteResponse = await req
                    .post('/api/v1/route')
                    .send({ specialRole: '404', templateName: template.name, domainId: routerDomainId })
                    .expect(200);
                routeId = postRouteResponse.body.id;

                const response = await req.get(example.url + template.name + '/rendered?domain=' + domain).expect(200);

                expect(response.body.content).to.eq(contentUpdated);
            } finally {
                await req.delete('/api/v1/route/' + routeId);
                await req.delete('/api/v1/router_domains/' + routerDomainId);
                await req.delete(example.url + template.name);
            }
        });
    });

    describe('Localized', () => {
        describe('Create', () => {
            it('should not allow to create localized template version for unsupported locale', async () => {
                try {
                    await req.post(example.url).send(example.correct).expect(200);

                    await req
                        .put(example.url + example.correct.name + '/localized/pt-BR')
                        .send({ content: example.correct.content })
                        .expect(422);
                } finally {
                    await req.delete(example.url + example.correct.name).expect(204);
                }
            });

            it('should not allow to create localized template version for a non-existent template', async () => {
                const nonExistentTemplate = 'non-existent-template';

                await req
                    .put(example.url + nonExistentTemplate + '/localized/ua-UA')
                    .send({ content: example.correct.content })
                    .expect(404);
            });

            it('should create localized template version', async () => {
                try {
                    await req.post(example.url).send(example.correct).expect(200);

                    const response = await req
                        .put(example.url + example.correct.name + '/localized/ua-UA')
                        .send({ content: example.correct.content })
                        .expect(200);

                    expect(response.body).deep.equal({
                        content: example.correct.content,
                    });
                } finally {
                    await req.delete(example.url + example.correct.name).expect(204);
                }
            });
        });

        describe('Update', () => {
            it('should update localized template version', async () => {
                try {
                    await req.post(example.url).send(example.correct).expect(200);
                    await req
                        .put(example.url + example.correct.name + '/localized/ua-UA')
                        .send({ content: example.correct.content })
                        .expect(200);
                    const response = await req
                        .put(example.url + example.correct.name + '/localized/ua-UA')
                        .send({ content: example.updated.content })
                        .expect(200);
                    expect(response.body).deep.equal({
                        content: example.updated.content,
                    });
                } finally {
                    await req.delete(example.url + example.correct.name).expect(204);
                }
            });
        });

        describe('Delete', () => {
            it('should not allow to delete localized template version for a non-existent template', async () => {
                const nonExistentTemplate = 'non-existent-template';

                await req
                    .put(example.url + nonExistentTemplate + '/localized/ua-UA')
                    .send({ content: example.correct.content })
                    .expect(404);
            });

            it('should not allow to delete a non-existent localized template version', async () => {
                try {
                    await req.post(example.url).send(example.correct).expect(200);
                    await req
                        .put(example.url + example.correct.name + '/localized/ua-UA')
                        .send({ content: example.correct.content })
                        .expect(200);
                    await req.delete(example.url + example.correct.name + '/localized/en-US').expect(404);
                } finally {
                    await req.delete(example.url + example.correct.name).expect(204);
                }
            });

            it('should delete localized template version', async () => {
                try {
                    await req.post(example.url).send(example.correct).expect(200);
                    await req
                        .put(example.url + example.correct.name + '/localized/ua-UA')
                        .send({ content: example.correct.content })
                        .expect(200);
                    await req.delete(example.url + example.correct.name + '/localized/ua-UA').expect(204);
                } finally {
                    await req.delete(example.url + example.correct.name).expect(204);
                }
            });
        });
    });
});
