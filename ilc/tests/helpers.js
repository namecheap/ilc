const deepmerge = require('deepmerge');

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
        getReportingPlugin: () => null,
        getI18nParamsDetectionPlugin: () => null,
    };
}

module.exports = {
    getRegistryMock,
    getRouterProps,
    getFragmentResponses,
    getPluginManagerMock,
}
