import _ from 'lodash';
import nock from 'nock';
import supertest from 'supertest';
import app from '../server/app';
import { expect, getServerAddress } from './common';
import { SettingKeys } from '../server/settings/interfaces';
import { withSetting } from './utils/withSetting';
import RouterDomains from '../server/routerDomains/interfaces';

const example = {
    url: '/api/v1/template/',
    correct: Object.freeze({
        name: 'ncTestTemplateName',
        content: 'ncTestTemplateContent'
    }),
    correctLocalized: Object.freeze({
        name: 'localizedTestTemplate' + Math.random() * 10000,
        content: 'test content',
        localizedVersions: {
            'es-MX': { content: 'Espaniol content' },
            'fr-FR': { content: 'French content' },
        }
    }),
    updated: Object.freeze({
        name: 'ncTestTemplateName',
        content: 'ncTestTemplateContentUpdated'
    }),
    updatedLocalized: Object.freeze({
        content: 'test content',
        localizedVersions: {
            'fr-FR': { content: 'French superior content' },
            'fr-CA': { content: 'Canada content' }
        }
    }),
};

describe(`Tests ${example.url}`, () => {
    let req: supertest.SuperTest<supertest.Test>;
    let reqWithAuth: supertest.SuperTest<supertest.Test>;
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
            const response = await req.post(example.url)
                .send(_.omit(example.correct, 'name'))
                .expect(422, '"name" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: content', async () => {
            const response = await req.post(example.url)
                .send(_.omit(example.correct, 'content'))
                .expect(422, '"content" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: name', async () => {
            const incorrect = {
                name: 123,
                content: 456
            };

            let response = await req.post(example.url)
                .send(incorrect)
                .expect(422, '"content" must be a string\n"name" must be a string');

            expect(response.body).deep.equal({});

            response = await req.get(example.url + incorrect.name)
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await req.post(example.url)
                .send(example.correct)
                .expect(200)

            let createdTemplate = { ...example.correct, localizedVersions: {} };
            expect(response.body).deep.equal(createdTemplate);

            response = await req.get(example.url + example.correct.name)
                .expect(200);

            expect(response.body).deep.equal(createdTemplate);
        });

        it('should create localized versions of template', async () => {
            await withSetting(SettingKeys.I18nSupportedLocales, Object.keys(example.correctLocalized.localizedVersions), async () => {
                let response = await req.post(example.url)
                    .send(example.correctLocalized);
                expect(response.status).to.eq(200, response.text);
            });
        });

        it('should not accept not supported languages', async () => {
            await withSetting(SettingKeys.I18nSupportedLocales, ['es-MX', 'ch-CH'], async () => {
                let response = await req.post(example.url)
                    .send(example.correctLocalized);
                expect(response.status).to.eq(422, response.text);
                expect(response.text).to.contain('locales are not supported');
            });
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.post(example.url)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            const incorrect = { name: 123 };
            const response = await req.get(example.url + incorrect.name)
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record w/o authentication', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await reqWithAuth.get(example.url + example.correct.name)
                .expect(200);

            expect(response.body).deep.equal({ ...example.correct, localizedVersions: {} });
        });

        it('should return localized versions of the template', async () => {
            await withSetting(SettingKeys.I18nSupportedLocales, Object.keys(example.correctLocalized.localizedVersions), async () => {
                await req.post(example.url).send(example.correctLocalized).expect(200);
            })

            const response = await reqWithAuth.get(example.url + example.correctLocalized.name)
                .expect(200);

            expect(response.body).deep.equal(example.correctLocalized);
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
                                'Link': 'https://my.awesome.server/my-awesome-stylesheet.css;rel=stylesheet;loveyou=3000,https://my.awesome.server/my-awesome-script.js;rel=script;loveyou=3000',
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
                `
            };

            includes.forEach(({
                                  api: {
                                      route,
                                      delay,
                                      response: {
                                          status,
                                          data,
                                          headers,
                                      },
                                  },
                              }) => scope.persist().get(route).delay(delay).reply(status, data, headers));

            try {
                await req.post(example.url).send(template).expect(200);

                const response = await reqWithAuth.get(example.url + template.name + '/rendered').expect(200);

                expect(response.body).to.eql({
                    styleRefs: ['https://my.awesome.server/my-awesome-stylesheet.css'],
                    name: template.name,
                    content: `
                    <html>
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width,initial-scale=1"/>
                        ${`<!-- Template include "${includes[0].attributes.id}" START -->\n` +
                    '<link rel="stylesheet" href="https://my.awesome.server/my-awesome-stylesheet.css">' +
                    includes[0].api.response.data + '\n' +
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
                `
                });
            } finally {
                await req.delete(example.url + template.name);
            }
        });

        it('should return localized version of rendered template', async () => {
            await withSetting(SettingKeys.I18nSupportedLocales, Object.keys(example.correctLocalized.localizedVersions), async () => {
                await req.post(example.url).send(example.correctLocalized).expect(200);
            });

            const response = await req.get(example.url + example.correctLocalized.name + '/rendered?locale=' + 'es-MX');

            expect(response.status).to.eq(200, JSON.stringify(response.body));
            expect(response.body.content).to.eq(example.correctLocalized.localizedVersions['es-MX'].content);
        });

        it('should return 404 while requesting a non-existent rendered template', async () => {
            const incorrect = { name: 123 };
            const response = await req
                .get(example.url + incorrect.name + '/rendered')
                .expect(404, 'Not found');

            expect(response.body).to.eql({});
        });

        it('should successfully return all existed records', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req.get(example.url)
                .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(example.correct);
        });

        describe('template with domain', () => {
            let domainId: string;
            let routeId: string;

            let example = <any>{
                app: {
                    url: '/api/v1/app/',
                    correct: {
                        name: '@portal/ncTestAppName',
                        spaBundle: 'http://localhost:1234/ncTestAppName.js',
                        kind: 'primary',
                    },
                },
                template: {
                    url: '/api/v1/template/',
                    correct: {
                        name: 'ncTestTemplateDomainName',
                        content: 'ncTestTemplateContent'
                    },
                    noRoute: {
                        name: 'ncTestNoRouteTemplateName',
                        content: 'ncTestNoRouteTemplateContent'
                    },
                    template500: {
                        name: 'ncTest500TemplateName',
                        content: 'ncTest500TemplateContent'
                    },
                },
                routerDomain: {
                    url: '/api/v1/router_domains/',
                    correct: {
                        domainName: '',
                        template500: 'ncTest500TemplateName',
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
                }
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

                const routeResponse = await req.post(example.route.url).send({
                    ...example.route.correct,
                    domainId,
                }).expect(200);

                routeId = routeResponse.body.id;
            });

            afterEach(async () => {
                domainId && await req.delete(example.routerDomain.url + domainId);
                routeId && await req.delete(example.route.url + routeId);

                await req.delete(example.app.url + encodeURIComponent(example.app.correct.name));
                await req.delete(example.template.url + example.template.correct.name);
                await req.delete(example.template.url + example.template.noRoute.name);
                await req.delete(example.template.url + example.template.template500.name);
            });

            it('Should return template for given domain', async () => {
                const templateResponse = await req.get(example.template.url + example.template.correct.name + '/rendered');
                const templateWithDomainResponse = await req.get(example.template.url + example.template.correct.name + '/rendered?locale=' + 'es-MX' + '&domain=' +  reqAddress);

                expect(templateResponse.body).to.deep.equal(templateWithDomainResponse.body);
            });
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesn\'t exist', async () => {
            const incorrect = { name: 123 };
            const response = await req.put(example.url + incorrect.name)
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req.put(example.url + example.correct.name)
                .send(example.updated)
                .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: content', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const incorrect = {
                name: 123,
                content: 456
            };

            const response = await req.put(example.url + example.correct.name)
                .send(_.omit(incorrect, 'name'))
                .expect(422, '"content" must be a string');
            expect(response.body).deep.equal({});
        });

        it('should successfully update record', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req.put(example.url + example.correct.name)
                .send(_.omit(example.updated, 'name'))
                .expect(200);

            expect(response.body).deep.equal({ ...example.updated, localizedVersions: {} });
        });

        it('should successfully update localized versions of the template', async () => {
            let allLangs = Object.keys(example.correctLocalized.localizedVersions).concat(Object.keys(example.updatedLocalized.localizedVersions));
            await withSetting(SettingKeys.I18nSupportedLocales, allLangs, async () => {
                await req.post(example.url).send(example.correctLocalized).expect(200);

                const response = await req.put(example.url + example.correctLocalized.name)
                    .send(_.omit(example.updatedLocalized, 'name'))
                    .expect(200);

                expect(response.body).deep.equal({ name: example.correctLocalized.name, ...example.updatedLocalized });
            });
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.put(example.url + example.correct.name)
                    .send(_.omit(example.updated, 'name'))
                    .expect(401);
            });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesn\'t exist', async () => {
            const incorrect = { name: 123 };
            const response = await req.delete(example.url + incorrect.name)
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record if doesn\'t have any reference from foreign (routerDomains -> template500) to current primary key', async () => {
            let routerDomainsId;

            try {
                await req.post(example.url).send(example.correct).expect(200);

                const responseRouterDomains = await req.post('/api/v1/router_domains/')
                    .send({
                        domainName: 'domainNameCorrect.com',
                        template500: example.correct.name,
                    })
                    .expect(200)

                routerDomainsId = responseRouterDomains.body.id;

                const response = await req.delete(example.url + example.correct.name)
                    .expect(500);
                expect(response.text).to.include('Internal server error occurred.');

                await req.delete('/api/v1/router_domains/' + routerDomainsId);

                await req.delete(example.url + example.correct.name)
                    .expect(204, '');

                await req.get(example.url + example.correct.name)
                    .expect(404, 'Not found');
            } finally {
                routerDomainsId && await req.delete('/api/v1/router_domains/' + routerDomainsId);
                await req.delete(example.url + example.correct.name);
            }
        });

        it('should successfully delete record', async () => {
            await req.post(example.url).send(example.correct).expect(200);

            const response = await req.delete(example.url + example.correct.name)
                .expect(204, '');

            expect(response.body).deep.equal({});
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await reqWithAuth.delete(example.url + example.correct.name)
                    .expect(401);
            });
        });
    });
});
