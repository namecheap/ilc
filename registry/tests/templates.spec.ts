import _ from 'lodash';
import nock from 'nock';

import { request, expect, requestWithAuth } from './common';

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
    afterEach(async () => {
        await request.delete(example.url + example.correctLocalized.name);
        await request.delete(example.url + example.correct.name);
    });

    describe('Create', () => {
        it('should not create record without a required field: name', async () => {
            const response = await request.post(example.url)
                .send(_.omit(example.correct, 'name'))
                .expect(422, '"name" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record without a required field: content', async () => {
            const response = await request.post(example.url)
                .send(_.omit(example.correct, 'content'))
                .expect(422, '"content" is required');

            expect(response.body).deep.equal({});
        });

        it('should not create record with incorrect type of field: name', async () => {
            const incorrect = {
                name: 123,
                content: 456
            };

            let response = await request.post(example.url)
                .send(incorrect)
                .expect(422, '"content" must be a string\n"name" must be a string');

            expect(response.body).deep.equal({});

            response = await request.get(example.url + incorrect.name)
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully create record', async () => {
            let response = await request.post(example.url)
                .send(example.correct)
                .expect(200)

            let createdTemplate = { ...example.correct, localizedVersions: {} };
            expect(response.body).deep.equal(createdTemplate);

            response = await request.get(example.url + example.correct.name)
                .expect(200);

            expect(response.body).deep.equal(createdTemplate);
        });

        it('should create localized versions of template', async () => {
            let response = await request.post(example.url)
                .send(example.correctLocalized);
            expect(response.status).to.eq(200, response.text);
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.post(example.url)
                    .send(example.correct)
                    .expect(401);
            });
        });
    });

    describe('Read', () => {
        it('should return 404 for non-existing id', async () => {
            const incorrect = { name: 123 };
            const response = await request.get(example.url + incorrect.name)
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully return record w/o authentication', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await requestWithAuth.get(example.url + example.correct.name)
                .expect(200);

            expect(response.body).deep.equal({ ...example.correct, localizedVersions: {} });
        });

        it('should return localized versions of the template', async () => {
            await request.post(example.url).send(example.correctLocalized).expect(200);

            const response = await requestWithAuth.get(example.url + example.correctLocalized.name)
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
                              }) => scope.log(console.log).persist().get(route).delay(delay).reply(status, data, headers));

            try {
                await request.post(example.url).send(template).expect(200);

                const response = await requestWithAuth.get(example.url + template.name + '/rendered').expect(200);

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
                await request.delete(example.url + template.name);
            }
        });

        it('should return 404 while requesting a non-existent rendered template', async () => {
            const incorrect = { name: 123 };
            const response = await request
                .get(example.url + incorrect.name + '/rendered')
                .expect(404, 'Not found');

            expect(response.body).to.eql({});
        });

        it('should successfully return all existed records', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.get(example.url)
                .expect(200);

            expect(response.body).to.be.an('array').that.is.not.empty;
            expect(response.body).to.deep.include(example.correct);
        });
    });

    describe('Update', () => {
        it('should not update any record if record doesn\'t exist', async () => {
            const incorrect = { name: 123 };
            const response = await request.put(example.url + incorrect.name)
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should not update record if forbidden "name" is passed', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.put(example.url + example.correct.name)
                .send(example.updated)
                .expect(422, '"name" is not allowed');

            expect(response.body).deep.equal({});
        });

        it('should not update record with incorrect type of field: content', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const incorrect = {
                name: 123,
                content: 456
            };

            const response = await request.put(example.url + example.correct.name)
                .send(_.omit(incorrect, 'name'))
                .expect(422, '"content" must be a string');
            expect(response.body).deep.equal({});
        });

        it('should successfully update record', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.put(example.url + example.correct.name)
                .send(_.omit(example.updated, 'name'))
                .expect(200);

            expect(response.body).deep.equal({ ...example.updated, localizedVersions: {} });
        });

        it('should successfully update localized versions of the template', async () => {
            await request.post(example.url).send(example.correctLocalized).expect(200);

            const response = await request.put(example.url + example.correctLocalized.name)
                .send(_.omit(example.updatedLocalized, 'name'))
                .expect(200);

            expect(response.body).deep.equal({ name: example.correctLocalized.name, ...example.updatedLocalized });
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.put(example.url + example.correct.name)
                    .send(_.omit(example.updated, 'name'))
                    .expect(401);
            });
        });
    });

    describe('Delete', () => {
        it('should not delete any record if record doesn\'t exist', async () => {
            const incorrect = { name: 123 };
            const response = await request.delete(example.url + incorrect.name)
                .expect(404, 'Not found');

            expect(response.body).deep.equal({});
        });

        it('should successfully delete record if doesn\'t have any reference from foreign (routerDomains -> template500) to current primary key', async () => {
            let routerDomainsId;

            try {
                await request.post(example.url).send(example.correct).expect(200);

                const responseRouterDomains = await request.post('/api/v1/router_domains/')
                    .send({
                        domainName: 'domainNameCorrect.com',
                        template500: example.correct.name,
                    })
                    .expect(200)

                routerDomainsId = responseRouterDomains.body.id;

                const response = await request.delete(example.url + example.correct.name)
                    .expect(500);
                expect(response.text).to.include('Internal server error occurred.');

                await request.delete('/api/v1/router_domains/' + routerDomainsId);

                await request.delete(example.url + example.correct.name)
                    .expect(204, '');

                await request.get(example.url + example.correct.name)
                    .expect(404, 'Not found');
            } finally {
                routerDomainsId && await request.delete('/api/v1/router_domains/' + routerDomainsId);
                await request.delete(example.url + example.correct.name);
            }
        });

        it('should successfully delete record', async () => {
            await request.post(example.url).send(example.correct).expect(200);

            const response = await request.delete(example.url + example.correct.name)
                .expect(204, '');

            expect(response.body).deep.equal({});
        });

        describe('Authentication / Authorization', () => {
            it('should deny access w/o authentication', async () => {
                await requestWithAuth.delete(example.url + example.correct.name)
                    .expect(401);
            });
        });
    });
});
