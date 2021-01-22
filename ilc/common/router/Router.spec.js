const chai = require('chai');

const Router = require('./Router');

describe('router', () => {
    const registryConfig = Object.freeze({
        routes: [
            {
                routeId: 'commonRoute',
                route: '*',
                next: true,
                template: 'commonTemplate',
                slots: {
                    navbar: {
                        appName: 'navbar',
                        props: {
                            firstNavbarSlotProp: 'firstNavbarSlotProp',
                            secondNavbarSlotProp: 'secondNavbarSlotProp',
                        },
                        kind: 'essential',
                    },
                    footer: {
                        appName: 'footer',
                        props: {
                            firstFooterSlotProp: 'firstFooterSlotProp',
                            secondFooterSlotProp: 'secondFooterSlotProp',
                        },
                        kind: 'regular',
                    },
                },
                meta: {
                    firstCommonRouteMetaProp: 'firstCommonRouteMetaProp',
                    secondCommonRouteMetaProp: 'secondCommonRouteMetaProp',
                },
            },
            {
                routeId: 'heroRoute',
                route: '/hero/*',
                next: true,
                template: 'heroTemplate',
                slots: {
                    hero: {
                        appName: 'hero',
                        props: {
                            firstHeroSlotProp: 'firstHeroSlotProp',
                            secondHeroSlotProp: 'secondHeroSlotProp',
                        },
                        kind: 'essential',
                    },
                },
                meta: {
                    firstHeroRouteMetaProp: 'firstHeroRouteMetaProp',
                    secondHeroRouteMetaProp: 'secondHeroRouteMetaProp',
                },
            },
            {
                routeId: 'appsRoute',
                route: '/hero/apps',
                next: false,
                slots: {
                    apps: {
                        appName: 'apps',
                        props: {
                            firstAppsSlotProp: 'firstAppsSlotProp',
                            secondAppsSlotProp: 'secondAppsSlotProp',
                        },
                        kind: 'primary',
                    },
                },
                meta: {
                    firstAppsRouteMetaProp: 'firstAppsRouteMetaProp',
                    secondAppsRouteMetaProp: 'secondAppsRouteMetaProp',
                },
            },
            {
                routeId: 'newsRoute',
                route: '/news',
                next: false,
                slots: {
                    news: {
                        appName: 'news',
                        props: {
                            firstNewsSlotProp: 'firstNewsSlotProp',
                            secondNewsSlotProp: 'secondNewsSlotProp',
                        },
                        kind: 'primary',
                    },
                },
                meta: {
                    firstNewsRouteMetaProp: 'firstNewsRouteMetaProp',
                    secondNewsRouteMetaProp: 'secondNewsRouteMetaProp',
                },
            },
        ],
        specialRoutes: {
            '404': {
                routeId: 'errorsRoute',
                route: '/404',
                next: false,
                template: 'errorsTemplate',
                slots: {
                    navbar: {
                        appName: 'navbar',
                        kind: 'essential',
                    },
                    footer: {
                        appName: 'footer',
                    },
                },
                meta: {
                    firstErrorsRouteMetaProp: 'firstErrorsRouteMetaProp',
                    secondErrorsRouteMetaProp: 'secondErrorsRouteMetaProp',
                    thirdErrorsRouteMetaProp: 'thirdErrorsRouteMetaProp',
                },
            },
        },
    });

    describe('.match()', function () {
        it('should throw an error when 404 special route does not exist', () => {
            const router = new Router({
                routes: registryConfig.routes,
                specialRoutes: {},
            });
            const reqUrl = '/nonexistent';

            chai.expect(router.match.bind(router, reqUrl)).to.throw(router.errors.NoRouteMatchError);
        });

        it('should throw an error when a route does not have a template', () => {
            const routes = [
                {
                    routeId: 'noTemplateRoute',
                    route: '/no-template',
                    next: false,
                    slots: {}
                },
            ];

            const router = new Router({
                routes,
                specialRoutes: registryConfig.specialRoutes,
            });
            const reqUrl = '/no-template';

            chai.expect(router.match.bind(router, reqUrl)).to.throw(router.errors.NoBaseTemplateMatchError);
        });

        it('should return matched route by request url', () => {
            const router = new Router(registryConfig);
            const reqUrl = '/hero/apps?prop=value';

            chai.expect(router.match(reqUrl)).to.be.eql({
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
                meta: {
                    ...registryConfig.routes[0].meta,
                    ...registryConfig.routes[1].meta,
                    ...registryConfig.routes[2].meta,
                },
            });
        });

        it('should return 404 route when a router does not match any route', () => {
            const router = new Router(registryConfig);
            const reqUrl = '/nonexistent?prop=value';

            chai.expect(router.match(reqUrl)).to.be.eql({
                routeId: 'errorsRoute',
                route: '/404',
                basePath: '/',
                reqUrl,
                template: 'errorsTemplate',
                specialRole: 404,
                slots: {
                    ...registryConfig.specialRoutes['404'].slots,
                },
                meta: {
                    ...registryConfig.specialRoutes['404'].meta,
                },
            });
        });

        describe('when a route has `/` at the end', () => {
            const routeThatHasTrailingSlashAtTheEnd = Object.freeze({
                routeId: 'launchpadRoute',
                route: '/launchpad/',
                next: false,
                template: 'launchpadTemplate',
                slots: {
                    launchpad: {
                        appName: 'launchpad',
                        props: {
                            firstHeroSlotProp: 'firstLaunchpadSlotProp',
                            secondHeroSlotProp: 'secondLaunchpadSlotProp',
                        },
                        kind: 'primary',
                    },
                },
            });

            const registryConfigWithRouteThatHasTrailingSlashAtTheEnd = Object.freeze({
                ...registryConfig,
                routes: [
                    routeThatHasTrailingSlashAtTheEnd,
                    ...registryConfig.routes
                ],
            });

            it('should return a matched route by a request url that does not have `/` at the end', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlashAtTheEnd);
                const reqUrlThatDoesNotHaveTrailingSlashAtTheEnd = '/launchpad';

                chai.expect(router.match(reqUrlThatDoesNotHaveTrailingSlashAtTheEnd)).to.be.eql({
                    routeId: 'launchpadRoute',
                    route: '/launchpad/',
                    basePath: '/launchpad',
                    reqUrl: reqUrlThatDoesNotHaveTrailingSlashAtTheEnd,
                    template: 'launchpadTemplate',
                    specialRole: null,
                    slots: routeThatHasTrailingSlashAtTheEnd.slots,
                });
            });

            it('should return a matched route by a request url that has `/` at the end', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlashAtTheEnd);
                const reqUrlThatHasTrailingSlashAtTheEnd = '/launchpad/';

                chai.expect(router.match(reqUrlThatHasTrailingSlashAtTheEnd)).to.be.eql({
                    routeId: 'launchpadRoute',
                    route: '/launchpad/',
                    basePath: '/launchpad',
                    reqUrl: reqUrlThatHasTrailingSlashAtTheEnd,
                    template: 'launchpadTemplate',
                    specialRole: null,
                    slots: routeThatHasTrailingSlashAtTheEnd.slots,
                });
            });

            it('should return a matched route when a requested url is `/`', () => {
                const routeThatEqualsTrailingSlash = Object.freeze({
                    routeId: 'homeRoute',
                    route: '/',
                    next: false,
                    template: 'homeTemplate',
                    slots: {
                        home: {
                            appName: 'home',
                            props: {
                                firstHomeSlotProp: 'firstHomeSlotProp',
                                secondHomeSlotProp: 'secondHomeSlotProp',
                            },
                            kind: 'primary',
                        },
                    },
                });
                const registryConfigThatHasRouteThatEqualsTrailingSlash = Object.freeze({
                    ...registryConfig,
                    routes: [
                        routeThatEqualsTrailingSlash,
                        ...registryConfig.routes,
                    ],
                });
                const router = new Router(registryConfigThatHasRouteThatEqualsTrailingSlash);
                const reqUrl = '/';

                chai.expect(router.match(reqUrl)).to.be.eql({
                    routeId: 'homeRoute',
                    route: '/',
                    basePath: '/',
                    reqUrl,
                    template: 'homeTemplate',
                    specialRole: null,
                    slots: routeThatEqualsTrailingSlash.slots,
                });
            });

            it('should return 404 route when a router does not match a route by a requested url that has something after `/`', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlashAtTheEnd);
                const reqUrl = '/launchpad/something';

                chai.expect(router.match(reqUrl)).to.be.eql({
                    routeId: 'errorsRoute',
                    route: '/404',
                    basePath: '/',
                    reqUrl,
                    template: 'errorsTemplate',
                    specialRole: 404,
                    slots: {
                        ...registryConfigWithRouteThatHasTrailingSlashAtTheEnd.specialRoutes['404'].slots,
                    },
                    meta: {
                        ...registryConfigWithRouteThatHasTrailingSlashAtTheEnd.specialRoutes['404'].meta,
                    },
                });
            });
        });
    });

    describe('.matchSpecial()', function () {
        it('should return special 404 route', () => {
            const router = new Router(registryConfig);
            const reqUrl = '/tst';

            chai.expect(router.matchSpecial(reqUrl, 404)).to.be.eql({
                routeId: 'errorsRoute',
                route: '/404',
                basePath: '/',
                reqUrl,
                template: 'errorsTemplate',
                specialRole: 404,
                slots: {
                    ...registryConfig.specialRoutes['404'].slots,
                },
                meta: {
                    ...registryConfig.specialRoutes['404'].meta,
                },
            });
        });

        it('should throw an error when asked for non-existing special route', () => {
            const router = new Router(registryConfig);
            const reqUrl = '/tst';

            chai.expect(() => router.matchSpecial(reqUrl, 999)).to.throw(router.errors.NoRouteMatchError);
        });

        it('should throw an error when a special route does not have a template', () => {
            const router = new Router({
                routes: registryConfig.routes,
                specialRoutes: {
                    '404': {
                        routeId: 'errorsRoute',
                        route: '/404',
                        next: false,
                        template: '',
                        slots: {
                            navbar: {
                                appName: 'navbar',
                            },
                        },
                        meta: {
                            firstErrorsRouteMetaProp: 'firstErrorsRouteMetaProp',
                        },
                    },
                },
            });
            const reqUrl = '/no-template';

            chai.expect(() => router.matchSpecial(reqUrl, '404')).to.throw(router.errors.NoBaseTemplateMatchError);
        });
    });
});
