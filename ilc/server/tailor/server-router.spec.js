const chai = require('chai');
const sinon = require('sinon');
const _ = require('lodash');

const ServerRouter = require('./server-router.js');

describe('server router', () => {
    const logger = {
        warn: sinon.spy(),
    };

    const specialRoutes = {
        '404': {
            routeId: 'errorsRoute',
            route: '/404',
            next: false,
            template: 'errorsTemplate',
            slots: {},
        },
    };

    afterEach(() => {
        logger.warn.resetHistory();
    });

    it('should throw an error when a router can not find information about an application', () => {
        const registryConfig = {
            apps: {},
            routes: [
                {
                    routeId: 'noAppRoute',
                    route: '/no-app',
                    next: false,
                    template: 'noAppTemplate',
                    slots: {
                        noAppSlot: {
                            appName: 'noApp',
                        },
                    },
                },
            ],
            specialRoutes,
        };
        const reqUrl = '/no-app';

        const router = new ServerRouter(logger);

        chai.expect(router.getTemplateInfo.bind(router, registryConfig, reqUrl)).to.throw('Can\'t find info about app.');
    });

    it('should throw an error when an application does not have a specified source of fragment', () => {
        const registryConfig = {
            apps: {
                'noSsrSrc': {
                    spaBundle: 'https://somewhere.com/noSsrSrcSpaBundle.js',
                    cssBundle: 'https://somewhere.com/noSsrSrcCssBundle.css',
                    dependencies: {
                        navbarFirstDependency: 'https://somewhere.com/noSsrSrcFirstDependency.js',
                        navbarSecondDependency: 'https://somewhere.com/noSsrSrcSecondDependency.js',
                    },
                    props: {
                        noSsrSrcFirstProp: 'noSsrSrcFirstProp',
                        noSsrSrcSecondProp: 'noSsrSrcSecondProp',
                    },
                    kind: 'primary',
                    name: '@portal/noSsrSrc',
                    ssr: {
                        timeout: 1000,
                    },
                },
            },
            routes: [
                {
                    routeId: 'noSsrSrc',
                    route: '/no-ssr-src',
                    next: false,
                    template: 'noSsrSrcTemplate',
                    slots: {
                        noSsrSrc: {
                            appName: 'noSsrSrc',
                        },
                    },
                },
            ],
            specialRoutes,
        };
        const reqUrl = '/no-ssr-src';

        const router = new ServerRouter(logger);

        chai.expect(router.getTemplateInfo.bind(router, registryConfig, reqUrl)).to.throw('No url specified for fragment!');
    });

    it('should get template info', () => {
        const apps = {
            '@portal/navbar': {
                spaBundle: 'https://somewhere.com/navbarSpaBundle.js',
                cssBundle: 'https://somewhere.com/navbarCssBundle.css',
                dependencies: {
                    navbarFirstDependency: 'https://somewhere.com/navbarFirstDependency.js',
                    navbarSecondDependency: 'https://somewhere.com/navbarSecondDependency.js',
                },
                props: {
                    navbarFirstProp: 'navbarFirstProp',
                    navbarSecondProp: 'navbarSecondProp',
                },
                kind: 'primary',
                name: '@portal/navbar',
                ssr: {
                    timeout: 1000,
                    src: 'https://somewhere.com/navbar?prop=value',
                },
            },
            '@portal/footer': {
                spaBundle: 'https://somewhere.com/footerSpaBundle.js',
                cssBundle: 'https://somewhere.com/footerCssBundle.css',
                dependencies: {
                    footerFirstDependency: 'https://somewhere.com/footerFirstDependency.js',
                    footerSecondDependency: 'https://somewhere.com/footerSecondDependency.js',
                },
                kind: 'regular',
                name: '@portal/footer',
                ssr: {
                    timeout: 2000,
                    src: 'https://somewhere.com/footer?prop=value',
                },
            },
            '@portal/hero': {
                spaBundle: 'https://somewhere.com/heroSpaBundle.js',
                cssBundle: 'https://somewhere.com/heroCssBundle.css',
                dependencies: {
                    heroFirstDependency: 'https://somewhere.com/heroFirstDependency.js',
                    heroSecondDependency: 'https://somewhere.com/heroSecondDependency.js',
                },
                props: {
                    heroFirstProp: 'heroFirstProp',
                    heroSecondProp: 'heroSecondProp',
                },
                kind: 'essential',
                name: '@portal/hero',
            },
            'contact': {
                spaBundle: 'https://somewhere.com/contactSpaBundle.js',
                cssBundle: 'https://somewhere.com/contactCssBundle.css',
                dependencies: {
                    contactFirstDependency: 'https://somewhere.com/contactFirstDependency.js',
                    contactSecondDependency: 'https://somewhere.com/contactSecondDependency.js',
                },
                props: {
                    contactFirstProp: 'contactFirstProp',
                    contactSecondProp: 'contactSecondProp',
                },
                kind: 'regular',
                name: 'contact',
                ssr: {
                    timeout: 4000,
                    src: 'https://somewhere.com/contact',
                },
            },
            'apps': {
                spaBundle: 'https://somewhere.com/appsSpaBundle.js',
                cssBundle: 'https://somewhere.com/appsCssBundle.css',
                dependencies: {
                    appsFirstDependency: 'https://somewhere.com/appsFirstDependency.js',
                    appsSecondDependency: 'https://somewhere.com/appsSecondDependency.js',
                },
                kind: 'primary',
                name: 'apps',
                ssr: {
                    timeout: 4000,
                    src: 'https://somewhere.com/apps?prop=value',
                },
            },
            '@portal/news': {
                spaBundle: 'https://somewhere.com/newsSpaBundle.js',
                cssBundle: 'https://somewhere.com/newsCssBundle.css',
                dependencies: {
                    newsFirstDependency: 'https://somewhere.com/newsFirstDependency.js',
                    newsSecondDependency: 'https://somewhere.com/newsSecondDependency.js',
                },
                props: {
                    newsFirstProp: 'newsFirstProp',
                    newsSecondProp: 'newsSecondProp',
                },
                kind: 'essential',
                name: '@portal/news',
                ssr: {
                    timeout: 5000,
                    src: 'https://somewhere.com/news?prop=value',
                },
            },
        };

        const routes = [
            {
                routeId: 'commonRoute',
                route: '*',
                next: true,
                template: 'commonTemplate',
                slots: {
                    navbar: {
                        appName: apps['@portal/navbar'].name,
                        kind: 'regular',
                    },
                    footer: {
                        appName: apps['@portal/footer'].name,
                        props: {
                            firstFooterSlotProp: 'firstFooterSlotProp',
                            secondFooterSlotProp: 'secondFooterSlotProp',
                        },
                        kind: 'primary',
                    },
                },
            },
            {
                routeId: 'heroRoute',
                route: '/hero/*',
                next: true,
                template: 'heroTemplate',
                slots: {
                    hero: {
                        appName: apps['@portal/hero'].name,
                    },
                    contact: {
                        appName: apps['contact'].name,
                        props: {
                            contactFirstProp: 'changedContactFirstProp',
                            firstContactSlotProp: 'firstContactSlotProp',
                            secondContactSlotProp: 'secondContactSlotProp',
                        },
                    },
                },
            },
            {
                routeId: 'appsRoute',
                route: '/hero/apps',
                next: false,
                slots: {
                    apps: {
                        appName: apps['apps'].name,
                    },
                },
            },
            {
                routeId: 'newsRoute',
                route: '/news',
                next: false,
                slots: {
                    news: {
                        appName: apps['@portal/news'].name,
                    },
                },
            },
        ];

        const registryConfig = {
            apps,
            routes,
            specialRoutes,
        };

        const reqUrl = '/hero/apps?prop=value';

        const expectedRoute = {
            routeId: 'appsRoute',
            route: '/hero/apps',
            basePath: '/hero/apps',
            reqUrl,
            template: 'heroTemplate',
            specialRole: null,
            slots: {
                ...registryConfig.routes[0].slots,
                ...registryConfig.routes[1].slots,
                ...registryConfig.routes[2].slots,
            },
        };

        const expectedNavbarUrl = new URL(registryConfig.apps['@portal/navbar'].ssr.src);
        expectedNavbarUrl.searchParams.append('routerProps', Buffer.from(JSON.stringify({
            basePath: expectedRoute.basePath,
            reqUrl: expectedRoute.reqUrl,
            fragmentName: 'navbar__at__navbar',
        })).toString('base64'));
        expectedNavbarUrl.searchParams.append('appProps', Buffer.from(JSON.stringify(registryConfig.apps['@portal/navbar'].props)).toString('base64'));

        const expectedFooterUrl = new URL(registryConfig.apps['@portal/footer'].ssr.src);
        expectedFooterUrl.searchParams.append('routerProps', Buffer.from(JSON.stringify({
            basePath: expectedRoute.basePath,
            reqUrl: expectedRoute.reqUrl,
            fragmentName: 'footer__at__footer',
        })).toString('base64'));
        expectedFooterUrl.searchParams.append('appProps', Buffer.from(JSON.stringify(registryConfig.routes[0].slots.footer.props)).toString('base64'));

        const expectedContactUrl = new URL(registryConfig.apps.contact.ssr.src);
        expectedContactUrl.searchParams.append('routerProps', Buffer.from(JSON.stringify({
            basePath: expectedRoute.basePath,
            reqUrl: expectedRoute.reqUrl,
            fragmentName: 'contact__at__contact',
        })).toString('base64'));
        expectedContactUrl.searchParams.append('appProps', Buffer.from(JSON.stringify({
            ...registryConfig.apps.contact.props,
            ...registryConfig.routes[1].slots.contact.props,
        })).toString('base64'));

        const expectedAppsUrl = new URL(registryConfig.apps.apps.ssr.src);
        expectedAppsUrl.searchParams.append('routerProps', Buffer.from(JSON.stringify({
            basePath: expectedRoute.basePath,
            reqUrl: expectedRoute.reqUrl,
            fragmentName: 'apps__at__apps',
        })).toString('base64'));

        const expectedPage =
            `<fragment id="${registryConfig.apps['@portal/navbar'].name}" slot="navbar" timeout="${registryConfig.apps['@portal/navbar'].ssr.timeout}" src="${expectedNavbarUrl.toString()}"></fragment>` +
            `<fragment id="${registryConfig.apps['@portal/footer'].name}" slot="footer" timeout="${registryConfig.apps['@portal/footer'].ssr.timeout}" src="${expectedFooterUrl.toString()}" primary="true"></fragment>` +
            `<fragment id="${registryConfig.apps['contact'].name}" slot="contact" timeout="${registryConfig.apps.contact.ssr.timeout}" src="${expectedContactUrl.toString()}"></fragment>` +
            `<fragment id="${registryConfig.apps['apps'].name}" slot="apps" timeout="${registryConfig.apps.apps.ssr.timeout}" src="${expectedAppsUrl.toString()}"></fragment>`;

        const router = new ServerRouter(logger);

        chai.expect(router.getTemplateInfo(registryConfig, reqUrl)).to.be.eql({
            route: expectedRoute,
            page: expectedPage,
        });
        chai.expect(logger.warn.calledOnceWithExactly(
            `More then one primary slot "apps" found for "${expectedRoute.reqUrl}".\n` +
            'Make it regular to avoid unexpected behaviour.'
        )).to.be.true;
    });
});
