const deepmerge = require('deepmerge');
const nock = require('nock');

function getRegistryMock(overrideConfig = {}) {
    return {
        getTemplate:
            overrideConfig.getTemplate ||
            (() => ({
                data: {
                    content:
                        '<!DOCTYPE html><html lang="en-US"><head></head><body>\n<!-- Region "primary" START -->\n<div id="primary"><slot name="primary"></slot></div>\n<script>window.ilcApps.push(\'primary\');window.ilcApps.push(Infinity);</script>\n<!-- Region "primary" END -->\n</body></html>',
                },
            })),
        preheat: overrideConfig.preheat || (() => Promise.resolve()),
        getConfig: () =>
            deepmerge(
                {
                    apps: {
                        '@portal/primary': {
                            spaBundle: 'http://localhost/index.js',
                            kind: 'primary',
                            ssr: { src: 'http://apps.test/primary' },
                            l10nManifest: '/l10n/primary/manifest.json',
                        },
                        '@portal/regular': {
                            spaBundle: 'http://localhost/index.js',
                            kind: 'regular',
                            ssr: { src: 'http://apps.test/regular' },
                        },
                        '@portal/essential': {
                            spaBundle: 'http://localhost/index.js',
                            kind: 'essential',
                            ssr: { src: 'http://apps.test/seesntial' },
                        },
                        '@portal/wrapper': {
                            spaBundle: 'http://localhost/index.js',
                            kind: 'wrapper',
                            ssr: { src: 'http://apps.test/wrapper' },
                        },
                        '@portal/wrappedApp': {
                            spaBundle: 'http://localhost/index.js',
                            kind: 'primary',
                            ssr: { src: 'http://apps.test/wrappedApp' },
                        },
                        '@portal/wrapperApp': {
                            spaBundle: 'http://localhost/index.js',
                            kind: 'primary',
                            ssr: { src: 'http://apps.test/wrapperApp' },
                        },
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
                            template: 'master',
                        },
                        {
                            slots: {
                                primary: { appName: '@portal/primary' },
                            },
                            routeId: 2,
                            route: '/primary',
                            template: 'master',
                        },
                        {
                            slots: {
                                primary: { appName: '@portal/wrappedApp' },
                            },
                            routeId: 3,
                            route: '/wrapper',
                            template: 'master',
                        },
                    ],
                    specialRoutes: {
                        404: {
                            slots: {},
                            routeId: 3,
                            route: '',
                            next: false,
                            template: 'master',
                        },
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
                                locale: ['en-US', 'ua-UA'],
                            },
                            routingStrategy: 'prefix_except_default',
                        },
                    },
                },
                overrideConfig,
            ),
    };
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
            logger: console,
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
        .reply(
            200,
            function (uri) {
                return JSON.stringify({
                    url: uri,
                    headers: this.req.headers,
                });
            },
            {
                'set-cookie': 'asd=asd',
                'x-custom-header': 'asd',
            },
        );
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
        spaBundleUrl: 'http://localhost:8239/test/dir/single_spa.js',
        async: false,
        primary: false,
        public: false,
        timeout: 1000,
        returnHeaders: false,
        forwardQuerystring: false,
        ignoreInvalidSsl: false,
    };

    return { ...defaultAttributes, ...overrideAttributes };
}

module.exports = {
    getRegistryMock,
    getRouterProps,
    getFragmentResponses,
    getPluginManagerMock,
    setupMockServersForApps,
    getFragmentAttributes,
};
