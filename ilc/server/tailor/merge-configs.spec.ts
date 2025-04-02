import { expect, version } from 'chai';
import { Route } from '../types/RegistryConfig';
import { mergeConfigs } from './merge-configs';
import { TransformedRegistryConfig } from '../types/Registry';

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
            versionId: 'v1.0.0', // Added versionId
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
            versionId: 'v1.0.1', // Added versionId
        },
    };

    const routes: Route[] = [
        {
            routeId: 1,
            route: '*',
            next: true,
            orderPos: -99,
            template: 'commonTemplate',
            slots: {},
            meta: {}, // Added meta
            versionId: 'v1.0.0', // Added versionId
        },
        {
            routeId: 2,
            route: '/const',
            next: false,
            orderPos: 1,
            slots: {
                const: {
                    appName: apps['@portal/const'].name,
                    kind: null,
                    props: {
                        constSlotFirstProp: 'constSlotFirstProp',
                        constSlotSecondProp: {
                            firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                        },
                    },
                },
            },
            meta: {}, // Added meta
            versionId: 'v1.0.1', // Added versionId
        },
        {
            routeId: 3,
            route: '/will-change',
            next: false,
            orderPos: 99,
            slots: {
                willChange: {
                    appName: apps['@portal/will-change'].name,
                    kind: null,
                    props: {
                        willChangeSlotFirstProp: 'willChangeSlotFirstProp',
                        willChangeSlotSecondProp: {
                            firstPropOfWillChangeRouteSlotSecondProp: 'firstPropOfWillChangeRouteSlotSecondProp',
                        },
                    },
                },
            },
            meta: {}, // Added meta
            versionId: 'v1.0.2', // Added versionId
        },
    ];

    const specialRoutes = {
        404: {
            routeId: 10,
            next: false,
            orderPos: 50,
            template: 'errorsTemplate',
            slots: {},
            meta: {},
            versionId: 's',
        },
    };

    const sharedLibs = {
        sharedLibrary1: 'https://somewhere.com/original1.js',
        sharedLibrary2: 'https://somewhere.com/original2.js',
        sharedLibrary3: 'https://somewhere.com/original3.js',
    };

    const registryConfig: TransformedRegistryConfig = {
        apps,
        routes,
        specialRoutes,
        sharedLibs,
        settings: {} as any,
        dynamicLibs: {} as any,
    };

    describe('should return original config', () => {
        it('should not override anything when override config does not exist', () => {
            expect(mergeConfigs(registryConfig, null)).to.be.equal(registryConfig);
        });

        it('should not override anything when override config does not have apps and routes', () => {
            expect(mergeConfigs(registryConfig, {} as any)).to.be.equal(registryConfig);
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
                routeId: 4,
                route: '/new',
                next: false,
                orderPos: 90,
                slots: {
                    new: {
                        appName: apps['@portal/const'].name,
                    },
                },
                meta: {}, // Added meta
                versionId: 'v1.0.3', // Added versionId
            },
            {
                routeId: 3,
                route: '/changed',
                orderPos: -98,
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
                meta: {}, // Added meta
                versionId: 'v1.0.4', // Added versionId
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
            routeId: 3,
            route: '/changed',
            next: false,
            orderPos: -98,
            slots: {
                willChange: {
                    appName: apps['@portal/will-change'].name,
                    props: {
                        willChangeSlotFirstProp: 'willChangeSlotFirstProp',
                        willChangeSlotSecondProp: {
                            firstPropOfWillChangeRouteSlotSecondProp: 'changedFirstPropOfWillChangeRouteSlotSecondProp',
                        },
                    },
                    kind: null,
                },
                new: {
                    appName: apps['@portal/const'].name,
                },
            },
            meta: {}, // Added meta
            versionId: 'v1.0.4', // Added versionId
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
            versionId: 'v1.0.0',
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

            expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(mergedConfig);
        });

        it('should override only routes when they exist', () => {
            const overrideConfig = {
                routes: overrideRoutes,
            };

            const [newRoute] = overrideConfig.routes;
            const [commonRoute, constRoute] = registryConfig.routes;

            const mergedConfig = {
                ...registryConfig,
                routes: [commonRoute, mergedRoute, constRoute, newRoute],
            };

            expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(mergedConfig);
        });

        it('should override only sharedLibs when they exist', () => {
            const overrideConfig = {
                sharedLibs: overrideSharedLibs,
            };

            const mergedConfig = {
                ...registryConfig,
                sharedLibs: mergedSharedLibs,
            };

            expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(mergedConfig);
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
                routes: [commonRoute, mergedRoute, constRoute, newRoute],
                sharedLibs: mergedSharedLibs,
            };

            expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(mergedConfig);
        });

        it('should override route by `route` property', () => {
            const registryConfigWithRouteThatShouldBeChanged = {
                ...registryConfig,
                routes: [
                    ...registryConfig.routes,
                    {
                        routeId: 4,
                        route: '/should-be-changed-by-route-property',
                        next: false,
                        orderPos: 10,
                        slots: {
                            const: {
                                appName: apps['@portal/const'].name,
                                kind: null,
                                props: {
                                    constSlotFirstProp: 'constSlotFirstProp',
                                    constSlotSecondProp: {
                                        firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                                    },
                                },
                            },
                        },
                        meta: {}, // Added meta
                        versionId: 'v1.0.5', // Added versionId
                    },
                ],
            };

            const overrideConfig = {
                routes: [
                    {
                        route: '/should-be-changed-by-route-property',
                        next: true,
                        orderPos: 100,
                        slots: {
                            new: {
                                appName: apps['@portal/const'].name,
                            },
                        },
                    },
                ],
            };

            expect(mergeConfigs(registryConfigWithRouteThatShouldBeChanged, overrideConfig)).to.be.eql({
                ...registryConfig,
                routes: [
                    ...registryConfig.routes,
                    {
                        routeId: 4,
                        route: '/should-be-changed-by-route-property',
                        next: true,
                        meta: {},
                        orderPos: 100,
                        slots: {
                            const: {
                                appName: apps['@portal/const'].name,
                                props: {
                                    constSlotFirstProp: 'constSlotFirstProp',
                                    constSlotSecondProp: {
                                        firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                                    },
                                },
                                kind: null,
                            },
                            new: {
                                appName: apps['@portal/const'].name,
                            },
                        },
                        versionId: 'v1.0.5',
                    },
                ],
            });
        });
        it('should override route only with same domains (no domain)', () => {
            const overrideConfig = {
                routes: [
                    {
                        routeId: 5,
                        route: '*',
                        next: false,
                        slots: {},
                        meta: {}, // Added meta
                        versionId: 'v1.0.5', // Added versionId
                        domainId: 7,
                    },
                ],
            };

            expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(registryConfig);
        });
        it('should override route only with same domains (no domain) (merge)', () => {
            const overrideConfig = {
                routes: [
                    {
                        routeId: 1,
                        route: '*',
                        next: false,
                        slots: {},
                        meta: {}, // Added meta
                        versionId: 'v1.0.5', // Added versionId
                        domainId: 7,
                    },
                ],
            };

            expect(mergeConfigs(registryConfig, overrideConfig)).to.be.eql(registryConfig);
        });
        it('should override route only with same domains (domain present)', () => {
            const overrideConfig = {
                routes: [
                    {
                        routeId: 5,
                        route: '/anotherdomain',
                        next: false,
                        orderPos: 999,
                        slots: {},
                        meta: {}, // Added meta
                        versionId: 'v1.0.5', // Added versionId
                        domainId: 7,
                    },
                ],
            };

            const mergedConfig = {
                apps,
                specialRoutes,
                sharedLibs,
                settings: {} as any,
                dynamicLibs: {} as any,
                routes: [
                    {
                        routeId: 1,
                        route: '*',
                        next: true,
                        orderPos: -99,
                        template: 'commonTemplate',
                        slots: {},
                        meta: {}, // Added meta
                        versionId: 'v1.0.0', // Added versionId
                    },
                    {
                        routeId: 2,
                        route: '/const',
                        next: false,
                        orderPos: 1,
                        slots: {
                            const: {
                                appName: apps['@portal/const'].name,
                                kind: null,
                                props: {
                                    constSlotFirstProp: 'constSlotFirstProp',
                                    constSlotSecondProp: {
                                        firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                                    },
                                },
                            },
                        },
                        meta: {}, // Added meta
                        versionId: 'v1.0.1', // Added versionId
                    },
                    {
                        routeId: 3,
                        route: '/will-change',
                        next: false,
                        orderPos: 99,
                        slots: {
                            willChange: {
                                appName: apps['@portal/will-change'].name,
                                kind: null,
                                props: {
                                    willChangeSlotFirstProp: 'willChangeSlotFirstProp',
                                    willChangeSlotSecondProp: {
                                        firstPropOfWillChangeRouteSlotSecondProp:
                                            'firstPropOfWillChangeRouteSlotSecondProp',
                                    },
                                },
                            },
                        },
                        meta: {}, // Added meta
                        versionId: 'v1.0.2', // Added versionId
                    },
                    {
                        routeId: 5,
                        route: '/anotherdomain',
                        next: false,
                        orderPos: 999,
                        slots: {},
                        meta: {}, // Added meta
                        versionId: 'v1.0.5', // Added versionId
                        domainId: 7,
                    },
                ],
            };

            expect(mergeConfigs(registryConfig, overrideConfig, 7)).to.be.eql(mergedConfig);
        });
        it('should override route only with same domains (domain present) (merge)', () => {
            const overrideConfig = {
                routes: [
                    {
                        routeId: 1,
                        route: '/anotherdomain',
                        template: 'anotherTemplate',
                        next: false,
                        orderPos: 999,
                        slots: {},
                        meta: {}, // Added meta
                        versionId: 'v1.0.5', // Added versionId
                        domainId: 7,
                    },
                ],
            };

            const mergedConfig = {
                apps,
                specialRoutes,
                sharedLibs,
                settings: {} as any,
                dynamicLibs: {} as any,
                routes: [
                    {
                        routeId: 2,
                        route: '/const',
                        next: false,
                        orderPos: 1,
                        slots: {
                            const: {
                                appName: apps['@portal/const'].name,
                                kind: null,
                                props: {
                                    constSlotFirstProp: 'constSlotFirstProp',
                                    constSlotSecondProp: {
                                        firstPropOfConstSlotSecondProp: 'firstPropOfConstSlotSecondProp',
                                    },
                                },
                            },
                        },
                        meta: {}, // Added meta
                        versionId: 'v1.0.1', // Added versionId
                    },
                    {
                        routeId: 3,
                        route: '/will-change',
                        next: false,
                        orderPos: 99,
                        slots: {
                            willChange: {
                                appName: apps['@portal/will-change'].name,
                                kind: null,
                                props: {
                                    willChangeSlotFirstProp: 'willChangeSlotFirstProp',
                                    willChangeSlotSecondProp: {
                                        firstPropOfWillChangeRouteSlotSecondProp:
                                            'firstPropOfWillChangeRouteSlotSecondProp',
                                    },
                                },
                            },
                        },
                        meta: {}, // Added meta
                        versionId: 'v1.0.2', // Added versionId
                    },
                    {
                        routeId: 1,
                        route: '/anotherdomain',
                        template: 'anotherTemplate',
                        next: false,
                        orderPos: 999,
                        slots: {},
                        meta: {}, // Added meta
                        versionId: 'v1.0.5', // Added versionId
                        domainId: 7,
                    },
                ],
            };

            expect(mergeConfigs(registryConfig, overrideConfig, 7)).to.be.eql(mergedConfig);
        });
    });
});
