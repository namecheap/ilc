const chai = require('chai');

const Router = require('./Router');

describe('router', () => {
    const registryConfig = {
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
            },
        ],
        specialRoutes: {
            '404': {
                routeId: 'errorsRoute',
                route: '/404',
                next: false,
                template: 'errorsTemplate',
                slots: {},
            },
        },
    };

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
            next: false,
            slots: {
                ...registryConfig.routes[0].slots,
            },
        });
    });
});
