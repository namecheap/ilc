const chai = require('chai');
const sinon = require('sinon');
const _ = require('lodash');
const {getRegistryMock} = require('../../tests/helpers');

const ServerRouter = require('./server-router.js');

describe('server router', () => {
    const logger = {
        warn: sinon.spy(),
        debug: sinon.spy(),
    };

    afterEach(() => {
        logger.warn.resetHistory();
    });

    it('should throw an error when a router can not find information about an application', () => {
        const registryConfig = getRegistryMock({
            routes: [
                {
                    route: '/no-app',
                    next: false,
                    template: 'noAppTemplate',
                    slots: {
                        noAppSlot: {
                            appName: 'noApp',
                        },
                    },
                    meta: {
                        noAppRouteMetaProp: 'noAppRouteMetaProp',
                    },
                },
            ],
        }).getConfig().data;
        const request = {registryConfig, ilcState: {}};

        const router = new ServerRouter(logger, request, '/no-app');

        chai.expect(() => router.getFragmentsTpl()).to.throw('Can\'t find info about app.');
        chai.expect(() => router.getFragmentsContext()).to.throw('Can\'t find info about app.');
    });

    describe('.getFragmentsContext()', () => {
        it('should throw an error when an application does not have a specified source of fragment', () => {
            const registryConfig = getRegistryMock({
                apps: {
                    '@portal/primary': {
                        ssr: {src: null}
                    },
                }
            }).getConfig().data;

            const request = {registryConfig, ilcState: {}};

            const router = new ServerRouter(logger, request, '/all');

            chai.expect(() => router.getFragmentsContext()).to.throw('No url specified for fragment!');
        });

        it('should warn if we have more then 1 primary slot on the page and ignore others', () => {
            const registryConfig = getRegistryMock({
                apps: {
                    '@portal/regular': {
                        kind: 'primary'
                    },
                }
            }).getConfig().data;

            const request = {registryConfig, ilcState: {}};

            const router = new ServerRouter(logger, request, '/all');

            const context = router.getFragmentsContext();

            chai.expect(context.primary__at__primary.primary).to.be.true;
            chai.expect(context.regular__at__regular.primary).to.be.undefined;
            chai.expect(logger.warn.calledOnceWithExactly(
                `More then one primary slot "regular" found for "/all".\n` +
                'Make it regular to avoid unexpected behaviour.'
            )).to.be.true;
        });
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
                ssr: {
                    timeout: 4000,
                    src: 'https://somewhere.com/apps?prop=value',
                    ignoreInvalidSsl: true,
                },
                wrappedWith: '@portal/news',
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
                ssr: {
                    timeout: 5000,
                    src: 'https://somewhere.com/news?prop=value',
                },
            },
        };

        const routes = [
            {
                route: '*',
                next: true,
                template: 'commonTemplate',
                slots: {
                    navbar: {
                        appName: '@portal/navbar',
                        kind: 'regular',
                    },
                    footer: {
                        appName: '@portal/footer',
                        props: {
                            firstFooterSlotProp: 'firstFooterSlotProp',
                            secondFooterSlotProp: 'secondFooterSlotProp',
                        },
                        kind: 'primary',
                    },
                },
                meta: {
                    firstCommonRouteMetaProp: 'firstCommonRouteMetaProp',
                    secondCommonRouteMetaProp: 'secondCommonRouteMetaProp',
                },
            },
            {
                route: '/hero/*',
                next: true,
                template: 'heroTemplate',
                slots: {
                    hero: {
                        appName: '@portal/hero',
                    },
                    contact: {
                        appName: 'contact',
                        props: {
                            contactFirstProp: 'changedContactFirstProp',
                            firstContactSlotProp: 'firstContactSlotProp',
                            secondContactSlotProp: 'secondContactSlotProp',
                        },
                    },
                },
                meta: {
                    firstHeroRouteMetaProp: 'firstHeroRouteMetaProp',
                    secondHeroRouteMetaProp: 'secondHeroRouteMetaProp',
                    thirdHeroRouteMetaProp: 'thirdHeroRouteMetaProp',
                },
            },
            {
                route: '/hero/apps',
                next: false,
                slots: {
                    apps: {
                        appName: 'apps',
                    },
                },
                meta: {
                    firstAppsRouteMetaProp: 'firstAppsRouteMetaProp',
                }
            },
            {
                route: '/news',
                next: false,
                slots: {
                    news: {
                        appName: '@portal/news',
                    },
                },
                meta: {
                    firstNewsRouteMetaProp: 'firstNewsRouteMetaProp',
                },
            },
        ];

        const registryConfig = getRegistryMock({
            apps,
            routes,
        }).getConfig().data;

        const request = {url: '/hero/apps?prop=value', registryConfig};

        const router = new ServerRouter(logger, request, request.url);

        chai.expect(router.getRoute()).to.be.eql({
            route: '/hero/apps',
            basePath: '/hero/apps',
            reqUrl: request.url,
            template: 'heroTemplate',
            specialRole: null,
            slots: {
                ...routes[0].slots,
                ...routes[1].slots,
                ...routes[2].slots,
            },
            meta: {
                ...routes[0].meta,
                ...routes[1].meta,
                ...routes[2].meta,
            },
        });

        chai.expect(router.getFragmentsTpl()).to.be.eql(
            `<fragment id="navbar__at__navbar" slot="navbar"></fragment>` +
            `<fragment id="footer__at__footer" slot="footer"></fragment>` +
            `<fragment id="contact__at__contact" slot="contact"></fragment>` +
            `<fragment id="apps__at__apps" slot="apps"></fragment>`
        );

        chai.expect(router.getFragmentsContext()).to.eql({
            navbar__at__navbar: {
                ...apps["@portal/navbar"].ssr,
                spaBundleUrl: apps["@portal/navbar"].spaBundle,
                appProps: {
                    ...apps["@portal/navbar"].props,
                    ...routes[0].slots.navbar.props,
                },
                wrapperConf: null
            },
            footer__at__footer: {
                ...apps["@portal/footer"].ssr,
                spaBundleUrl: apps["@portal/footer"].spaBundle,
                primary: true,
                appProps: {
                    ...routes[0].slots.footer.props,
                },
                wrapperConf: null
            },
            contact__at__contact: {
                ...apps.contact.ssr,
                spaBundleUrl: apps.contact.spaBundle,
                appProps: {
                    ...apps.contact.props,
                    ...routes[1].slots.contact.props,
                },
                wrapperConf: null
            },
            apps__at__apps: {
                src: apps.apps.ssr.src,
                spaBundleUrl: apps.apps.spaBundle,
                timeout: apps.apps.ssr.timeout,
                'ignore-invalid-ssl': true,
                appProps: {},
                wrapperConf: {
                    appId: 'news__at__apps',
                    name: '@portal/news',
                    ...apps["@portal/news"].ssr,
                    props: apps["@portal/news"].props
                }
            }
        });
    });

    it('should get template info when special route is enforced', () => {
        const apps = {
            'apps': {
                spaBundle: 'https://somewhere.com/appsSpaBundle.js',
                cssBundle: 'https://somewhere.com/appsCssBundle.css',
                dependencies: {
                    appsFirstDependency: 'https://somewhere.com/appsFirstDependency.js',
                    appsSecondDependency: 'https://somewhere.com/appsSecondDependency.js',
                },
                kind: 'primary',
                ssr: {
                    timeout: 4000,
                    src: 'https://somewhere.com/apps?prop=value'
                },
            },
        };

        const registryConfig = getRegistryMock({
            apps,
            specialRoutes: {
                '404': {
                    slots: {
                        apps: {
                            appName: 'apps',
                        },
                    }
                }
            },
        }).getConfig().data;

        const request = {
            ilcState: {forceSpecialRoute: 404},
            url: '/all?prop=value',
            registryConfig
        };

        const router = new ServerRouter(logger, request, request.url);

        chai.expect(router.getRoute()).to.be.eql({
            route: registryConfig.specialRoutes['404'].route,
            basePath: '/',
            reqUrl: request.url,
            template: registryConfig.specialRoutes['404'].template,
            specialRole: 404,
            slots: registryConfig.specialRoutes['404'].slots,
            meta: registryConfig.specialRoutes['404'].meta,
        });
        chai.expect(router.getFragmentsTpl()).to.be.eql(
            `<fragment id="apps__at__apps" slot="apps"></fragment>`
        );
        chai.expect(router.getFragmentsContext()).to.eql({
            apps__at__apps: {
                ...apps.apps.ssr,
                spaBundleUrl: apps.apps.spaBundle,
                primary: true,
                appProps: {},
                wrapperConf: null
            }
        });
    });
});
