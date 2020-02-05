import chai from 'chai';
import nock from 'nock';
import renderTemplate from './renderTemplate';

describe('renderTemplate', () => {
    it('should return a rendered template with replaced includes', async () => {
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
                            </div>
                        `,
                    },
                },
                attributes: {
                    id: 'include-id-1',
                    src: `${includesHost}/get/include/1`,
                    timeout: 100,
                },
            },
            {
                api: {
                    route: '/get/include/2',
                    delay: 90,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-2">
                                This include has all necessary attributes
                                but response is delayed
                            </div>
                        `,
                    }
                },
                attributes: {
                    id: 'include-id-2',
                    src: `${includesHost}/get/include/2`,
                    timeout: 100,
                }
            },
            {
                api: {
                    route: '/get/include/3',
                    delay: 100,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-3">
                                This include has all necessary attributes
                                and its timeout is equal 0
                                but response is delayed
                            </div>
                        `,
                    }
                },
                attributes: {
                    id: 'include-id-3',
                    src: `${includesHost}/get/include/3`,
                    timeout: 0,
                }
            },
            {
                api: {
                    route: '/get/include/4',
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-4">
                                This include has all necessary attributes
                                and does not have a provided timeout
                            </div>
                        `,
                    }
                },
                attributes: {
                    id: 'include-id-4',
                    src: `${includesHost}/get/include/4`,
                }
            },
            {
                api: {
                    route: '/get/include/5',
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-5">
                                This include does not have a source
                                but have an id
                            </div>
                        `,
                    }
                },
                attributes: {
                    id: 'include-id-5',
                    timeout: 100,
                },
            },
            {
                api: {
                    route: '/get/include/6',
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-6">
                                This include does not have an id
                                but have a source
                            </div>
                        `,
                    }
                },
                attributes: {
                    src: `${includesHost}/get/include/6`,
                    timeout: 100,
                },
            },
            {
                api: {
                    route: '/get/include/7',
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-7">
                                This include does not have all necessary attributes
                            </div>
                        `,
                    }
                },
                attributes: {
                    timeout: 100,
                },
            },
            {
                api: {
                    route: '/get/include/8',
                    delay: 0,
                    response: {
                        status: 500,
                        data: `The server threw an error when we are trying to get data from API`,
                    }
                },
                attributes: {
                    id: 'include-id-8',
                    src: `${includesHost}/get/include/8`,
                    timeout: 100,
                },
            },
        ];

        includes.forEach(({
            api: {
                route,
                delay,
                response: {
                    status,
                    data,
                },
            },
        }) => scope.get(route).delay(delay).reply(status, data));

        const template = `
            <html>
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1"/>
                <include    id="${includes[0].attributes.id}"   src="${includes[0].attributes.src}"    timeout="${includes[0].attributes.timeout}" />
                <include
                    id="${includes[1].attributes.id}"
                        src="${includes[1].attributes.src}"
                            timeout="${includes[1].attributes.timeout}"
                />
                <script>window.console.log('Something...')</script>
                <include
                    id="${includes[2].attributes.id}"   src="${includes[2].attributes.src}"    />
            </head>
            <body>
                <div class="class-name-1">Something...</div>
                <include id="${includes[3].attributes.id}"
                    src="${includes[3].attributes.src}"/>
                <div id="div-id-1" class="class-name-2">Something...</div>
                <include id="${includes[4].attributes.id}" timeout="${includes[4].attributes.timeout}"/>
                <div id="div-id-2" data-id="data-id-2" />
                <include
                    src="${includes[5].attributes.src}"
                        timeout="${includes[5].attributes.timeout}"
                />
                <include timeout="${includes[6].attributes.timeout}" />
                <include
                            id="${includes[7].attributes.id}"
                        src="${includes[7].attributes.src}"
                    timeout="${includes[7].attributes.timeout}"
                />
                <include without any attributes values />
            </body>
            </html>
        `;

        const renderedTemplate = await renderTemplate(template);

        chai.expect(renderedTemplate).to.be.equal(`
            <html>
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1"/>
                ${includes[0].api.response.data}
                ${includes[1].api.response.data}
                <script>window.console.log('Something...')</script>
                ${includes[2].api.response.data}
            </head>
            <body>
                <div class="class-name-1">Something...</div>
                ${includes[3].api.response.data}
                <div id="div-id-1" class="class-name-2">Something...</div>
                <include id="${includes[4].attributes.id}" timeout="${includes[4].attributes.timeout}"/>
                <div id="div-id-2" data-id="data-id-2" />
                <include
                    src="${includes[5].attributes.src}"
                        timeout="${includes[5].attributes.timeout}"
                />
                <include timeout="${includes[6].attributes.timeout}" />
                <include
                            id="${includes[7].attributes.id}"
                        src="${includes[7].attributes.src}"
                    timeout="${includes[7].attributes.timeout}"
                />
                <include without any attributes values />
            </body>
            </html>
        `);
    });
});
