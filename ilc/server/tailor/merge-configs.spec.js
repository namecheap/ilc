const chai = require('chai');

const mergeConfigs = require('./merge-configs');

describe('merge configs', () => {
    const apps = {
        '@portal/will-change': {
            spaBundle: 'https://somewhere.com/willChangeSpaBundle.js',
            cssBundle: 'https://somewhere.com/willChangeCssBundle.css',
            dependencies: {
                willChangeFirstDependency: 'https://somewhere.com/willChangeFirstDependency.js',
                willChangeSecondDependency: 'https://somewhere.com/willChangeSecondDependency.js',
            },
            props: {
                willChangeFirstProp: {
                    firstPropOfWillChangeFirstProp: 'firstPropOfWillChangeFirstProp',
                    secondPropOfWillChangeFirstProp: {
                        firstPropOfSecondPropOfWillChangeFirstProp: 'firstPropOfSecondPropOfWillChangeFirstProp',
                        secondPropOfSecondPropOfWillChangeFirstProp: 'secondPropOfSecondPropOfWillChangeFirstProp',
                    },
                },
                willChangeSecondProp: 'willChangeSecondProp',
            },
            kind: 'primary',
            name: '@portal/will-change',
            ssr: {
                timeout: 1000,
                src: '/will-change',
            },
        },
        '@portal/const': {
            spaBundle: 'https://somewhere.com/constSpaBundle.js',
            cssBundle: 'https://somewhere.com/constCssBundle.css',
            dependencies: {
                constFirstDependency: 'https://somewhere.com/constFirstDependency.js',
                constSecondDependency: 'https://somewhere.com/constSecondDependency.js',
            },
            props: {
                constFirstProp: {
                    firstPropOfConstFirstProp: 'firstPropOfConstFirstProp',
                },
                constSecondProp: 'constSecondProp',
            },
            kind: 'primary',
            name: '@portal/const',
            ssr: {
                timeout: 5000,
                src: '/const',
            },
        },
    };

    const routes = [
        {
            routeId: 'commonRoute',
            route: '*',
            next: true,
            template: 'commonTemplate',
            slots: {},
        },
        {
            routeId: 'constRoute',
            route: '/const',
            next: false,
            slots: {
                const: {
                    appName: apps['@portal/const'].name,
                    props: {
                        constSlotFirstProp: 'constSlotFirstProp',
                        constSlotSecondProp: {
                            firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                        },
                    },
                },
            },
        },
        {
            routeId: 'willChangeRoute',
            route: '/will-change',
            next: false,
            slots: {
                willChange: {
                    appName: apps['@portal/will-change'].name,
                    props: {
                        willChangeSlotFirstProp: 'willChangeSlotFirstProp',
                        willChangeSlotSecondProp: {
                            firstPropOfWillChangeRouteSlotSecondProp: 'firstPropOfWillChangeRouteSlotSecondProp',
                        },
                    },
                },
            },
        },
    ];

    const specialRoutes = {
        404: {
            routeId: 'errorsRoute',
            route: '/404',
            next: false,
            template: 'errorsTemplate',
            slots: {},
        },
    };

    const sharedLibs = {
        sharedLibrary1: 'https://somewhere.com/original1.js',
        sharedLibrary2: 'https://somewhere.com/original2.js',
        sharedLibrary3: 'https://somewhere.com/original3.js',
    };

    const registryConfig = {
        apps,
        routes,
        specialRoutes,
        sharedLibs,
    };

    describe('should return original config', () => {
        it('should not override anything when override config does not exist', () => {
            chai.expect(mergeConfigs(registryConfig, null)).to.be.equal(registryConfig);
        });

        it('should not override anything when override config does not have apps and routes', () => {
            chai.expect(mergeConfigs(registryConfig, {})).to.be.equal(registryConfig);
        });
    });

    describe('should return merged config', () => {
        const overrideApps = {
            '@portal/new': {
                spaBundle: 'https://somewhere.com/newSpaBundle.js',
                cssBundle: 'https://somewhere.com/newCssBundle.css',
                dependencies: {
                    newFirstDependency: 'https://somewhere.com/newFirstDependency.js',
                    newSecondDependency: 'https://somewhere.com/newSecondDependency.js',
                },
                props: {
                    newFirstProp: {
                        firstPropOfNewFirstProp: 'firstPropOfNewFirstProp',
                    },
                    newSecondProp: 'newSecondProp',
                },
                kind: 'primary',
                name: '@portal/new',
                ssr: {
                    timeout: 8000,
                    src: '/new',
                },
            },
            '@portal/will-change': {
                spaBundle: 'https://somewhere.com/changedSpaBundle.js',
                dependencies: {
                    willChangeFirstDependency: 'https://somewhere.com/changedFirstDependency.js',
                },
                props: {
                    willChangeFirstProp: {
                        secondPropOfWillChangeFirstProp: {
                            firstPropOfSecondPropOfWillChangeFirstProp:
                                'changedFirstPropOfSecondPropOfWillChangeFirstProp',
                        },
                    },
                },
                ssr: {
                    src: '/changed',
                },
            },
        };

        const overrideRoutes = [
            {
                routeId: 'newRoute',
                route: '/new',
                next: false,
                slots: {
                    new: {
                        appName: apps['@portal/const'].name,
                    },
                },
            },
            {
                routeId: 'willChangeRoute',
                route: '/changed',
                slots: {
                    willChange: {
                        props: {
                            willChangeSlotSecondProp: {
                                firstPropOfWillChangeRouteSlotSecondProp:
                                    'changedFirstPropOfWillChangeRouteSlotSecondProp',
                            },
                        },
                    },
                    new: {
                        appName: apps['@portal/const'].name,
                    },
                },
            },
        ];

        const overrideSharedLibs = {
            sharedLibrary1: {
                spaBundle: 'https://somewhere.com/overriden1.js',
            },
            sharedLibrary2: {
                spaBundle: 'https://somewhere.com/overriden2.js',
            },
        };

        const mergedRoute = {
            routeId: 'willChangeRoute',
            route: '/changed',
            next: false,
            slots: {
                willChange: {
                    appName: apps['@portal/will-change'].name,
                    props: {
                        willChangeSlotFirstProp: 'willChangeSlotFirstProp',
                        willChangeSlotSecondProp: {
                            firstPropOfWillChangeRouteSlotSecondProp: 'changedFirstPropOfWillChangeRouteSlotSecondProp',
                        },
                    },
                },
                new: {
                    appName: apps['@portal/const'].name,
                },
            },
        };

        const mergedApp = {
            spaBundle: 'https://somewhere.com/changedSpaBundle.js',
            cssBundle: 'https://somewhere.com/willChangeCssBundle.css',
            dependencies: {
                willChangeFirstDependency: 'https://somewhere.com/changedFirstDependency.js',
                willChangeSecondDependency: 'https://somewhere.com/willChangeSecondDependency.js',
            },
            props: {
                willChangeFirstProp: {
                    firstPropOfWillChangeFirstProp: 'firstPropOfWillChangeFirstProp',
                    secondPropOfWillChangeFirstProp: {
                        firstPropOfSecondPropOfWillChangeFirstProp: 'changedFirstPropOfSecondPropOfWillChangeFirstProp',
                        secondPropOfSecondPropOfWillChangeFirstProp: 'secondPropOfSecondPropOfWillChangeFirstProp',
                    },
                },
                willChangeSecondProp: 'willChangeSecondProp',
            },
            kind: 'primary',
            name: '@portal/will-change',
            ssr: {
                timeout: 1000,
                src: '/changed',
            },
        };

        const mergedSharedLibs = {
            sharedLibrary1: 'https://somewhere.com/overriden1.js',
            sharedLibrary2: 'https://somewhere.com/overriden2.js',
            sharedLibrary3: 'https://somewhere.com/original3.js',
        };

        it('should override only apps when they exist', () => {
            const overrideConfig = {
                apps: overrideApps,
            };

            const mergedConfig = {
                ...registryConfig,
                apps: {
                    ...registryConfig.apps,
                    '@portal/will-change': mergedApp,
                    '@portal/new': overrideConfig.apps['@portal/new'],
                },
            };

            chai.expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(mergedConfig);
        });

        it('should override only routes when they exist', () => {
            const overrideConfig = {
                routes: overrideRoutes,
            };

            const [newRoute] = overrideConfig.routes;
            const [commonRoute, constRoute] = registryConfig.routes;

            const mergedConfig = {
                ...registryConfig,
                routes: [commonRoute, constRoute, mergedRoute, newRoute],
            };

            chai.expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(mergedConfig);
        });

        it('should override only sharedLibs when they exist', () => {
            const overrideConfig = {
                sharedLibs: overrideSharedLibs,
            };

            const mergedConfig = {
                ...registryConfig,
                sharedLibs: mergedSharedLibs,
            };

            chai.expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(mergedConfig);
        });

        it('should override apps, routes and sharedLibs when they exist', () => {
            const overrideConfig = {
                apps: overrideApps,
                routes: overrideRoutes,
                sharedLibs: overrideSharedLibs,
            };

            const [newRoute] = overrideConfig.routes;
            const [commonRoute, constRoute] = registryConfig.routes;

            const mergedConfig = {
                ...registryConfig,
                apps: {
                    ...registryConfig.apps,
                    '@portal/will-change': mergedApp,
                    '@portal/new': overrideConfig.apps['@portal/new'],
                },
                routes: [commonRoute, constRoute, mergedRoute, newRoute],
                sharedLibs: mergedSharedLibs,
            };

            chai.expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(mergedConfig);
        });

        it('should override route by `route` property', () => {
            const registryConfigWithRouteThatShouldBeChanged = {
                ...registryConfig,
                routes: [
                    ...registryConfig.routes,
                    {
                        routeId: 'shouldBeChangedByRouteProperty',
                        route: '/should-be-changed-by-route-property',
                        next: false,
                        slots: {
                            const: {
                                appName: apps['@portal/const'].name,
                                props: {
                                    constSlotFirstProp: 'constSlotFirstProp',
                                    constSlotSecondProp: {
                                        firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                                    },
                                },
                            },
                        },
                    },
                ],
            };

            const overrideConfig = {
                routes: [
                    {
                        route: '/should-be-changed-by-route-property',
                        next: true,
                        slots: {
                            new: {
                                appName: apps['@portal/const'].name,
                            },
                        },
                    },
                ],
            };

            chai.expect(mergeConfigs(registryConfigWithRouteThatShouldBeChanged, overrideConfig)).to.be.eql({
                ...registryConfig,
                routes: [
                    ...registryConfig.routes,
                    {
                        routeId: 'shouldBeChangedByRouteProperty',
                        route: '/should-be-changed-by-route-property',
                        next: true,
                        slots: {
                            const: {
                                appName: apps['@portal/const'].name,
                                props: {
                                    constSlotFirstProp: 'constSlotFirstProp',
                                    constSlotSecondProp: {
                                        firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                                    },
                                },
                            },
                            new: {
                                appName: apps['@portal/const'].name,
                            },
                        },
                    },
                ],
            });
        });

        it('should put a new route before of another route', () => {
            const newRoute = {
                route: '/new-one',
                next: false,
                beforeOf: '/before-of-this-route-should-be-new-one',
                slots: {
                    const: {
                        appName: apps['@portal/const'].name,
                        props: {
                            constSlotFirstProp: 'constSlotFirstProp',
                            constSlotSecondProp: {
                                firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                            },
                        },
                    },
                },
            };

            const beforeOfThisRouteShouldBeNewOne = {
                routeId: 'beforeOfThisRouteShouldBeNewOne',
                route: '/before-of-this-route-should-be-new-one',
                next: false,
                slots: {
                    const: {
                        appName: apps['@portal/const'].name,
                        props: {
                            constSlotFirstProp: 'constSlotFirstProp',
                            constSlotSecondProp: {
                                firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                            },
                        },
                    },
                },
            };

            const registryConfigWithExtraRouteToTest = {
                ...registryConfig,
                routes: [...registryConfig.routes, beforeOfThisRouteShouldBeNewOne],
            };

            const overrideConfig = {
                routes: [newRoute],
            };

            chai.expect(mergeConfigs(registryConfigWithExtraRouteToTest, overrideConfig)).to.be.eql({
                ...registryConfig,
                routes: [...registryConfig.routes, newRoute, beforeOfThisRouteShouldBeNewOne],
            });
        });

        it('should override a route and move it before of another route', () => {
            const beforeOfThisRouteShouldBeNewOne = {
                routeId: 'beforeOfThisRouteShouldBeNewOne',
                route: '/before-of-this-route-should-be-new-one',
                next: false,
                slots: {},
            };

            const registryConfigWithExtraRouteToTest = {
                ...registryConfig,
                routes: [
                    ...registryConfig.routes,
                    beforeOfThisRouteShouldBeNewOne,
                    {
                        routeId: 'shouldBeChangedAndMovedBeforeOfAnotherRoute',
                        route: '/should-be-changed-and-moved-before-of-another-route',
                        next: false,
                        slots: {
                            const: {
                                appName: apps['@portal/const'].name,
                                props: {
                                    constSlotFirstProp: 'constSlotFirstProp',
                                    constSlotSecondProp: {
                                        firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                                    },
                                },
                            },
                        },
                    },
                ],
            };

            const overrideConfig = {
                routes: [
                    {
                        routeId: 'shouldBeChangedAndMovedBeforeOfAnotherRoute',
                        route: '/should-be-changed-and-moved-before-of-another-route',
                        beforeOf: '/before-of-this-route-should-be-new-one',
                        next: false,
                        slots: {
                            new: {
                                appName: apps['@portal/const'].name,
                            },
                        },
                    },
                ],
            };

            chai.expect(mergeConfigs(registryConfigWithExtraRouteToTest, overrideConfig)).to.be.eql({
                ...registryConfig,
                routes: [
                    ...registryConfig.routes,
                    {
                        routeId: 'shouldBeChangedAndMovedBeforeOfAnotherRoute',
                        route: '/should-be-changed-and-moved-before-of-another-route',
                        beforeOf: '/before-of-this-route-should-be-new-one',
                        next: false,
                        slots: {
                            const: {
                                appName: apps['@portal/const'].name,
                                props: {
                                    constSlotFirstProp: 'constSlotFirstProp',
                                    constSlotSecondProp: {
                                        firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                                    },
                                },
                            },
                            new: {
                                appName: apps['@portal/const'].name,
                            },
                        },
                    },
                    beforeOfThisRouteShouldBeNewOne,
                ],
            });
        });
    });
});
