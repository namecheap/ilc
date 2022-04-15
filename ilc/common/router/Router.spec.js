const chai = require('chai');

const Router = require('./Router');

describe('Router', () => {
    const registryConfig = Object.freeze({
        routes: [
            {
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

        it('should return matched route with correct basePath if exists only route="*" as final point', () => {
            const independentRouteStar = registryConfig.routes.find(n => n.route === '*');

            const router = new Router({
                ...registryConfig,
                routes: [{
                    ...independentRouteStar,
                    next: false,
                }],
            });
            const reqUrl = '/hero/apps?prop=value';

            const result = {
                ...independentRouteStar,
                reqUrl,
                specialRole: null,
                basePath: '/',
            };
            delete result.next;

            chai.expect(router.match(reqUrl)).to.be.eql(result);
        });

        it('should return 404 route when a router does not match any route', () => {
            const router = new Router(registryConfig);
            const reqUrl = '/nonexistent?prop=value';

            chai.expect(router.match(reqUrl)).to.be.eql({
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

        it('should merge slot props when necessary', () => {
            const router = new Router({
                routes: [{
                    route: '*',
                    next: true,
                    template: 'test',
                    slots: {
                        navbar: {
                            appName: 'navbar',
                            props: {
                                a: '1',
                            },
                            kind: 'essential',
                        },
                        body: {
                            appName: 'someApp',
                            props: {
                                c: '3',
                            },
                            kind: 'primary',
                        },
                    },
                    meta: {},
                }, {
                    route: '/hero/*',
                    slots: {
                        navbar: {
                            appName: 'navbar',
                            props: {
                                b: '2',
                            },
                        },
                        body: {
                            appName: 'anotherApp',
                            props: {
                                d: '4',
                            },
                            kind: 'primary',
                        },
                    },
                    meta: {},
                }],
                specialRoutes: {},
            });
            const reqUrl = '/hero/test';

            chai.expect(router.match(reqUrl)).to.be.eql({
                route: '/hero/*',
                basePath: '/hero',
                reqUrl,
                template: 'test',
                specialRole: null,
                slots: {
                    navbar: {
                        appName: 'navbar',
                        props: { // Props here are merged from both routes
                            a: '1',
                            b: '2',
                        },
                        kind: 'essential',
                    },
                    body: {
                        appName: 'anotherApp',
                        props: { // Props here are taken from last route only
                            d: '4',
                        },
                        kind: 'primary',
                    },
                },
                meta: {},
            });
        });

        describe('when a route has `/` at the end', () => {
            const routeWithTrailingSlash = Object.freeze({
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

            const registryConfigWithRouteThatHasTrailingSlash = Object.freeze({
                ...registryConfig,
                routes: [
                    routeWithTrailingSlash,
                    ...registryConfig.routes
                ],
            });

            it('should return a matched route by a request url that does not have `/` at the end', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlash);
                const reqUrl = '/launchpad';

                chai.expect(router.match(reqUrl)).to.be.eql({
                    route: '/launchpad/',
                    basePath: '/launchpad',
                    reqUrl,
                    template: 'launchpadTemplate',
                    specialRole: null,
                    slots: routeWithTrailingSlash.slots,
                    meta: {},
                });
            });

            it('should return a matched route by a request url that has `/` at the end', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlash);
                const reqUrl = '/launchpad/';

                chai.expect(router.match(reqUrl)).to.be.eql({
                    route: '/launchpad/',
                    basePath: '/launchpad',
                    reqUrl,
                    template: 'launchpadTemplate',
                    specialRole: null,
                    slots: routeWithTrailingSlash.slots,
                    meta: {},
                });
            });

            it('should return a matched route when a requested url is `/`', () => {
                const routeThatEqualsTrailingSlash = Object.freeze({
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
                    route: '/',
                    basePath: '/',
                    reqUrl,
                    template: 'homeTemplate',
                    specialRole: null,
                    slots: routeThatEqualsTrailingSlash.slots,
                    meta: {},
                });
            });

            it('should return 404 route when a router does not match a route by a requested url that has something after `/`', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlash);
                const reqUrl = '/launchpad/something';

                chai.expect(router.match(reqUrl)).to.be.eql({
                    route: '/404',
                    basePath: '/',
                    reqUrl,
                    template: 'errorsTemplate',
                    specialRole: 404,
                    slots: registryConfig.specialRoutes['404'].slots,
                    meta: registryConfig.specialRoutes['404'].meta,
                });
            });
        });

        describe('when a route has `/*` at the end', () => {
            const routeWithTrailingSlashAndAsterisk = Object.freeze({
                route: '/launchpad/*',
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

            const registryConfigWithRouteThatHasTrailingSlashAndAsterisk = Object.freeze({
                ...registryConfig,
                routes: [
                    routeWithTrailingSlashAndAsterisk,
                    ...registryConfig.routes
                ],
            });

            it('should match request url without "/" at the end', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlashAndAsterisk);
                const reqUrl = '/launchpad';

                chai.expect(router.match(reqUrl)).to.be.eql({
                    route: '/launchpad/*',
                    basePath: '/launchpad',
                    reqUrl,
                    template: 'launchpadTemplate',
                    specialRole: null,
                    slots: routeWithTrailingSlashAndAsterisk.slots,
                    meta: {},
                });
            });

            it('should match request url with "/" at the end', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlashAndAsterisk);
                const reqUrl = '/launchpad/';

                chai.expect(router.match(reqUrl)).to.be.eql({
                    route: '/launchpad/*',
                    basePath: '/launchpad',
                    reqUrl,
                    template: 'launchpadTemplate',
                    specialRole: null,
                    slots: routeWithTrailingSlashAndAsterisk.slots,
                    meta: {},
                });
            });

            it('should match request url with "/some_sub_route" at the end', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlashAndAsterisk);
                const reqUrl = '/launchpad/some_sub_route';

                chai.expect(router.match(reqUrl)).to.be.eql({
                    route: '/launchpad/*',
                    basePath: '/launchpad',
                    reqUrl,
                    template: 'launchpadTemplate',
                    specialRole: null,
                    slots: routeWithTrailingSlashAndAsterisk.slots,
                    meta: {},
                });
            });

            // test looks strange but previously we had this bug that caused problems
            it('should not match route if request url has same not defined text at the end of the route', () => {
                const router = new Router(registryConfigWithRouteThatHasTrailingSlashAndAsterisk);
                const reqUrl = '/launchpad-SOME_TRAILING_TEXT_FOO_BAR_BAZ';

                chai.expect(router.match(reqUrl)).to.be.eql({
                    route: '/404',
                    basePath: '/',
                    reqUrl,
                    template: 'errorsTemplate',
                    specialRole: 404,
                    slots: registryConfig.specialRoutes['404'].slots,
                    meta: registryConfig.specialRoutes['404'].meta,
                });
            });
        });
    });

    describe('.matchSpecial()', function () {
        it('should return special 404 route', () => {
            const router = new Router(registryConfig);
            const reqUrl = '/tst';

            chai.expect(router.matchSpecial(reqUrl, 404)).to.be.eql({
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
