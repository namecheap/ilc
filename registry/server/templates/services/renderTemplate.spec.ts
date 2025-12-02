import chai from 'chai';
import nock from 'nock';
import renderTemplate from './renderTemplate';

describe('renderTemplate', () => {
    const includesHost = 'https://api.include.com';
    let scope: nock.Scope;

    before(() => {
        scope = nock(includesHost);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    it('should return a rendered template with replaced includes', async () => {
        const includes = [
            {
                api: {
                    route: '/get/include/1?tst=a&lol=b',
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-1">
                                This include has all necessary attributes
                                and a specified link header which is a stylesheet and script
                            </div>
                        `,
                        headers: {
                            'X-Powered-By': 'JS',
                            'X-My-Awesome-Header': 'Awesome',
                            Link:
                                'https://my.awesome.server/my-awesome-stylesheet.css;rel=stylesheet;media=print;loveyou=3000,' +
                                'https://my.awesome.server/my-awesome-script.js;rel=script;crossorigin=anonymous;loveyou=3000,' +
                                'https://my.awesome.server/my-awesome-script.js;rel=preload;as=script',
                        },
                    },
                },
                attributes: {
                    id: 'include-id-1',
                    src: `${includesHost}/get/include/1?tst=a&lol=b`,
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
                                and a specified link header which is not a stylesheet
                                but response is delayed
                            </div>
                        `,
                        headers: {
                            'X-Powered-By': 'JS',
                            'X-My-Awesome-Header': 'Awesome',
                            Link: 'https://my.awesome.server/my-awesome-stylesheet.css;rel=txt;loveyou=3000',
                        },
                    },
                },
                attributes: {
                    id: 'include-id-2',
                    src: `${includesHost}/get/include/2`,
                    timeout: 100,
                },
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
                                and a specified header link which is a stylesheet and script
                                and its timeout is equal 0
                                but response is delayed
                            </div>
                        `,
                        headers: {
                            'X-Powered-By': 'JS',
                            'X-My-Awesome-Header': 'Awesome',
                            Link:
                                'https://my.amazing.server/my-amazing-stylesheet.css;rel=stylesheet;media=print;loveyou=3000;,' +
                                'https://my.amazing.server/my-awesome-script.js;rel=script;loveyou=3000;crossorigin=anonymous;,' +
                                'https://my.awesome.server/my-awesome-script.js;rel=preload;as=script',
                        },
                    },
                },
                attributes: {
                    id: 'include-id-3',
                    src: `${includesHost}/get/include/3`,
                    timeout: 0,
                },
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
                                and a specified header link which is a stylesheet
                                and does not have a provided timeout
                            </div>
                        `,
                        headers: {
                            'X-Powered-By': 'JS',
                            'X-My-Awesome-Header': 'Awesome',
                            Link: 'https://my.awesome.server/my-awesome-stylesheet.css;rel=stylesheet;loveyou=3000',
                        },
                    },
                },
                attributes: {
                    id: 'include-id-4',
                    src: `${includesHost}/get/include/4`,
                },
            },
        ];

        includes.forEach(
            ({
                api: {
                    route,
                    delay,
                    response: { status, data, headers },
                },
            }) => scope.get(route).delay(delay).reply(status, data, headers),
        );

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
                <include only with timeout="3000" />
                <div class="class-name-1">Something...</div>
                <include id="${includes[3].attributes.id}"
                    src="${includes[3].attributes.src}"/>
                <div id="div-id-1" class="class-name-2">Something...</div>
                <div id="div-id-2" data-id="data-id-2" />
                <include without any attributes values />
            </body>
            </html>
        `;

        const renderedTemplate = await renderTemplate(template);

        chai.expect(renderedTemplate.styleRefs).to.be.eqls([
            'https://my.awesome.server/my-awesome-stylesheet.css',
            'https://my.amazing.server/my-amazing-stylesheet.css',
        ]);
        chai.expect(renderedTemplate.content).to.be.equal(`
            <html>
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1"/>
                ${
                    `<!-- Template include "${includes[0].attributes.id}" START -->\n` +
                    '<link rel="preload" href="https://my.awesome.server/my-awesome-script.js" as="script">\n' +
                    '<link rel="stylesheet" href="https://my.awesome.server/my-awesome-stylesheet.css" media="print">\n' +
                    includes[0].api.response.data +
                    '\n' +
                    '<script src="https://my.awesome.server/my-awesome-script.js" crossorigin="anonymous"></script>\n' +
                    `<!-- Template include "${includes[0].attributes.id}" END -->`
                }
                ${
                    `<!-- Template include "${includes[1].attributes.id}" START -->\n` +
                    includes[1].api.response.data +
                    `\n<!-- Template include "${includes[1].attributes.id}" END -->`
                }
                <script>window.console.log('Something...')</script>
                ${
                    `<!-- Template include "${includes[2].attributes.id}" START -->\n` +
                    '<link rel="preload" href="https://my.awesome.server/my-awesome-script.js" as="script">\n' +
                    '<link rel="stylesheet" href="https://my.amazing.server/my-amazing-stylesheet.css" media="print">\n' +
                    includes[2].api.response.data +
                    '\n' +
                    '<script src="https://my.amazing.server/my-awesome-script.js" crossorigin="anonymous"></script>\n' +
                    `<!-- Template include "${includes[2].attributes.id}" END -->`
                }
            </head>
            <body>
                <include only with timeout="3000" />
                <div class="class-name-1">Something...</div>
                ${
                    `<!-- Template include "${includes[3].attributes.id}" START -->\n` +
                    '<link rel="stylesheet" href="https://my.awesome.server/my-awesome-stylesheet.css">\n' +
                    includes[3].api.response.data +
                    `\n<!-- Template include "${includes[3].attributes.id}" END -->`
                }
                <div id="div-id-1" class="class-name-2">Something...</div>
                <div id="div-id-2" data-id="data-id-2" />
                <include without any attributes values />
            </body>
            </html>
        `);
    });

    it('should throw an error when fails to fetch include', async () => {
        const includes = [
            {
                api: {
                    route: '/get/include/1?tst=a&lol=b',
                    delay: 0,
                    response: {
                        status: 500,
                        data: ``,
                        headers: {},
                    },
                },
                attributes: {
                    id: 'include-id-1',
                    src: `${includesHost}/get/include/1?tst=a&lol=b`,
                    timeout: 100,
                },
            },
        ];

        includes.forEach(
            ({
                api: {
                    route,
                    delay,
                    response: { status, data, headers },
                },
            }) => scope.get(route).delay(delay).reply(status, data, headers),
        );

        const template = `
            <html>
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1"/>
                <include    id="${includes[0].attributes.id}"   src="${includes[0].attributes.src}"    timeout="${includes[0].attributes.timeout}" />
            </head>
            <body>
            </body>
            </html>
        `;

        let catchedError;
        try {
            await renderTemplate(template);
        } catch (error: any) {
            catchedError = error;
        }

        chai.expect(catchedError.message).to.be.equal(
            `Failed to fetch include with ID "${includes[0].attributes.id}" due to: ` +
                `Request failed with status code ${includes[0].api.response.status}`,
        );
    });

    it('should return a rendered template with has all necessary attributes but without link header ', async () => {
        const include = {
            api: {
                route: '/get/include/9',
                delay: 0,
                response: {
                    status: 200,
                    data: `
                        <div id="include-id-9">
                            This include has all necessary attributes
                            and an empty link header
                        </div>
                    `,
                    headers: {
                        'X-Powered-By': 'JS',
                        'X-My-Awesome-Header': 'Awesome',
                    },
                },
            },
            attributes: {
                id: 'include-id-9',
                src: `${includesHost}/get/include/9`,
                timeout: 100,
            },
        };

        const {
            api: { route, delay, response },
        } = include;

        scope.get(route).delay(delay).reply(response.status, response.data, response.headers);

        const template = `<html><head></head><body><include id="${include.attributes.id}" src="${include.attributes.src}" timeout="${include.attributes.timeout}" /></body></html>`;

        const renderedTemplate = await renderTemplate(template);

        chai.expect(renderedTemplate.styleRefs).to.be.eqls([]);
        chai.expect(renderedTemplate.content).to.be.equal(
            `<html><head></head><body>${
                `<!-- Template include "${include.attributes.id}" START -->\n` +
                include.api.response.data +
                `\n<!-- Template include "${include.attributes.id}" END --></body></html>`
            }`,
        );
    });

    it('should throw an error when a template has duplicate includes sources or ids', async () => {
        let catchedError;

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
                    timeout: 0,
                },
            },
            {
                api: {
                    route: '/get/include/1',
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-1">
                                This include has the same id and src as the include with id 1
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
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-1">
                                This include has the same id as include 1
                            </div>
                        `,
                    },
                },
                attributes: {
                    id: 'include-id-1',
                    src: `${includesHost}/get/include/2`,
                    timeout: 100,
                },
            },
            {
                api: {
                    route: '/get/include/3',
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-3">
                                This include has all necessary attributes
                            </div>
                        `,
                    },
                },
                attributes: {
                    id: 'include-id-3',
                    src: `${includesHost}/get/include/3`,
                    timeout: 0,
                },
            },
            {
                api: {
                    route: '/get/include/3',
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-4">
                                This include has the same source as include 3
                            </div>
                        `,
                    },
                },
                attributes: {
                    src: `${includesHost}/get/include/3`,
                    timeout: 100,
                },
            },
            {
                api: {
                    route: '/get/include/5',
                    delay: 0,
                    response: {
                        status: 200,
                        data: `
                            <div id="include-id-5">
                                This include does not have an id
                                but have a source
                            </div>
                        `,
                    },
                },
                attributes: {
                    src: `${includesHost}/get/include/5`,
                    timeout: 100,
                },
            },
        ];

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
                    id="${includes[2].attributes.id}"   src="${includes[2].attributes.src}"  timeout="${includes[2].attributes.timeout}"  />
            </head>
            <body>
                <include only with timeout="3000" />
                <include  timeout="${includes[3].attributes.timeout}"
                    src="${includes[3].attributes.src}"/>
                <div class="class-name-1">Something...</div>
                <include
                    src="${includes[4].attributes.src}"
                        timeout="${includes[4].attributes.timeout}"
                />
                <div id="div-id-1" class="class-name-2">Something...</div>
                <div id="div-id-2" data-id="data-id-2" />
                <include without any attributes values />
            </body>
            </html>
        `;

        try {
            await renderTemplate(template);
        } catch (error: any) {
            catchedError = error;
        }

        chai.expect(catchedError.message).to.be.equal(
            `The current template has next duplicate includes sources or ids as follows: \n` +
                `${includes[1].attributes.id},\n` +
                `${includes[3].attributes.src}`,
        );
    });
});
