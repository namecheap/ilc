const deepmerge = require('deepmerge');
const nock = require('nock');

function getRegistryMock(overrideConfig = {}) {
    return {
        getTemplate: () => ({data: {content: `<!DOCTYPE html><html lang="en-US"><head></head><body><ilc-slot id="primary"/>\n<ilc-slot id="regular"/></body></html>`}}),
        getConfig: () => ({data: deepmerge({
                apps: {
                    '@portal/primary': {
                        spaBundle: 'http://localhost/index.js',
                        kind: 'primary',
                        ssr: {src: 'http://apps.test/primary'}
                    },
                    '@portal/regular': {
                        spaBundle: 'http://localhost/index.js',
                        kind: 'regular',
                        ssr: {src: 'http://apps.test/regular'}
                    }
                },
                templates: ['master'],
                routes: [
                    {
                        slots: {
                            primary: { appName: '@portal/primary' },
                            regular: { appName: '@portal/regular' },
                        },
                        routeId: 1,
                        route: '/all',
                        template: 'master'
                    },
                    {
                        slots: {
                            primary: { appName: '@portal/primary' },
                        },
                        routeId: 2,
                        route: '/primary',
                        template: 'master'
                    },
                ],
                specialRoutes: {
                    '404': {
                        slots: {},
                        routeId: 3,
                        route: '',
                        next: false,
                        template: 'master'
                    }
                },
                settings: {
                    trailingSlash: 'doNothing',
                    amdDefineCompatibilityMode: false,
                    i18n: {
                        enabled: true,
                        default: {
                            currency: 'USD',
                            locale: 'en-US',
                        },
                        supported: {
                            currency: ['USD', 'UAH'],
                            locale: ['en-US', 'ua-UA']
                        },
                        routingStrategy: 'prefix_except_default',
                    },
                }
            }, overrideConfig)})
    }
}

function getRouterProps(url) {
    const parsedURL = new URL('https://example.org' + url);
    const routerProps = parsedURL.searchParams.get('routerProps');
    return JSON.parse(Buffer.from(routerProps, 'base64').toString('utf8'));
}

function getFragmentResponses(responseBody) {
    const matches = responseBody.matchAll(/<!-- Fragment #\d+? "(.+?)" START -->(.+?)<!-- Fragment #/gs);
    const res = {};
    for (const match of Array.from(matches)) {
        res[match[1]] = JSON.parse(match[2]);
    }

    return res;
}

function getPluginManagerMock() {
    return {
        getReportingPlugin: () => ({
            type: 'reporting',
        }),
        getI18nParamsDetectionPlugin: () => ({
            type: 'i18nParamsDetection',
            detectI18nConfig: (req, Intl, I18nConfig, I18nCookie) => I18nConfig,
        }),
        getTransitionHooksPlugin: () => ({
            type: 'transitionHooks',
            getTransitionHooks: () => [],
        }),
    };
}

function setupMockServersForApps() {
    nock('http://apps.test')
        .persist(true)
        .get(/.?/)
        .reply(200, function (uri) {
            return JSON.stringify({
                url: uri,
                headers: this.req.headers,
            })
        });
}

/**
 * Returns mock attributes for tests
 * @param overrideAttributes override default attributes
 * @returns {{async: boolean, public: boolean, ignoreInvalidSsl: boolean, appProps: {}, wrapperConf: null, id: string, returnHeaders: boolean, url: string, timeout: number, primary: boolean, forwardQuerystring: boolean}}
 */
function getFragmentAttributes(overrideAttributes = {}) {
    const defaultAttributes = {
        id: 'microfrontend__at__slot',
        appProps: {},
        wrapperConf: null,
        url: 'https://domain.com/',
        async: false,
        primary: false,
        public: false,
        timeout: 1000,
        returnHeaders: false,
        forwardQuerystring: false,
        ignoreInvalidSsl: false,
    }

    return {...defaultAttributes, ...overrideAttributes};
}

module.exports = {
    getRegistryMock,
    getRouterProps,
    getFragmentResponses,
    getPluginManagerMock,
    setupMockServersForApps,
    getFragmentAttributes,
}
