import { expect } from 'chai';
import type { Route } from '../../common/types/Router';
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
        it('should add global override route (no domainId) when a domain is resolved from the request', () => {
            // Regression: before the fix, override routes without domainId were silently
            // dropped when resolveDomainId returned a numeric id for the current domain.
            const overrideConfig = {
                routes: [
                    {
                        routeId: 99,
                        route: '/new-global',
                        next: false,
                        orderPos: 50,
                        slots: {},
                        meta: {},
                        versionId: 'v1.0.99',
                        // no domainId — global LDE override
                    },
                ],
            };

            const result = mergeConfigs(registryConfig, overrideConfig, 5);

            const [commonRoute, constRoute, willChangeRoute] = registryConfig.routes;
            expect(result.routes).to.eql([
                commonRoute, // orderPos: -99
                constRoute, // orderPos: 1
                {
                    routeId: 99,
                    route: '/new-global',
                    next: false,
                    orderPos: 50,
                    slots: {},
                    meta: {},
                    versionId: 'v1.0.99',
                },
                willChangeRoute, // orderPos: 99
            ]);
        });

        it('should merge global override route (no domainId) into existing route when a domain is resolved from the request', () => {
            // Regression: before the fix, an override targeting an existing route by routeId
            // was ignored when domainId was resolved, so slot/prop changes were lost.
            const overrideConfig = {
                routes: [
                    {
                        routeId: 2,
                        route: '/const',
                        next: true,
                        // no domainId — global LDE override
                    },
                ],
            };

            const result = mergeConfigs(registryConfig, overrideConfig, 5);

            const constRoute = result.routes.find((r) => r.routeId === 2);
            expect(constRoute?.next).to.be.true;
            expect(result.routes).to.have.lengthOf(registryConfig.routes.length);
        });

        it('should not apply a domain-specific override route to a different domain', () => {
            // The original intent of isSameDomainRoute: an override tagged domainId:7
            // must not bleed into a request resolved to domainId:5.
            const overrideConfig = {
                routes: [
                    {
                        routeId: 99,
                        route: '/other-domain-only',
                        next: false,
                        orderPos: 50,
                        slots: {},
                        meta: {},
                        versionId: 'v1.0.99',
                        domainId: 7,
                    },
                ],
            };

            const result = mergeConfigs(registryConfig, overrideConfig, 5);

            expect(result.routes).to.have.lengthOf(registryConfig.routes.length);
            expect(result.routes.find((r) => r.route === '/other-domain-only')).to.be.undefined;
        });

        it('should add override route matched by domainAlias', () => {
            const overrideConfig = {
                routes: [
                    {
                        routeId: 99,
                        route: '/alias-only',
                        next: false,
                        orderPos: 50,
                        slots: {},
                        meta: {},
                        versionId: 'v1.0.99',
                        domainAlias: 'my-shop',
                    },
                ],
            };

            const result = mergeConfigs(registryConfig, overrideConfig, 5, 'my-shop');

            const [commonRoute, constRoute, willChangeRoute] = registryConfig.routes;
            expect(result.routes).to.eql([
                commonRoute,
                constRoute,
                {
                    routeId: 99,
                    route: '/alias-only',
                    next: false,
                    orderPos: 50,
                    slots: {},
                    meta: {},
                    versionId: 'v1.0.99',
                    domainAlias: 'my-shop',
                },
                willChangeRoute,
            ]);
        });

        it('should merge override route into existing route when matched by domainAlias', () => {
            const overrideConfig = {
                routes: [
                    {
                        routeId: 2,
                        route: '/const',
                        next: true,
                        domainAlias: 'my-shop',
                    },
                ],
            };

            const result = mergeConfigs(registryConfig, overrideConfig, 5, 'my-shop');

            const constRoute = result.routes.find((r) => r.routeId === 2);
            expect(constRoute?.next).to.be.true;
            expect(result.routes).to.have.lengthOf(registryConfig.routes.length);
        });

        it('should not apply domainAlias override route when alias does not match', () => {
            const overrideConfig = {
                routes: [
                    {
                        routeId: 99,
                        route: '/alias-only',
                        next: false,
                        orderPos: 50,
                        slots: {},
                        meta: {},
                        versionId: 'v1.0.99',
                        domainAlias: 'other-shop',
                    },
                ],
            };

            const result = mergeConfigs(registryConfig, overrideConfig, 5, 'my-shop');

            expect(result.routes).to.have.lengthOf(registryConfig.routes.length);
            expect(result.routes.find((r) => r.route === '/alias-only')).to.be.undefined;
        });

        it('should match by domainAlias when both domainAlias and domainId are on the override route', () => {
            // domainAlias takes precedence — domainId is ignored when alias is present
            const overrideConfig = {
                routes: [
                    {
                        routeId: 99,
                        route: '/alias-wins',
                        next: false,
                        orderPos: 50,
                        slots: {},
                        meta: {},
                        versionId: 'v1.0.99',
                        domainAlias: 'my-shop',
                        domainId: 999, // wrong id — should be ignored
                    },
                ],
            };

            const result = mergeConfigs(registryConfig, overrideConfig, 5, 'my-shop');

            expect(result.routes.find((r) => r.route === '/alias-wins')).to.exist;
        });

        it('should handle routes with same pattern but different orderPos including wildcard routes', () => {
            const registryConfigWithWildcardRoutes: TransformedRegistryConfig = {
                ...registryConfig,
                routes: [
                    {
                        routeId: 1,
                        route: '*',
                        next: true,
                        orderPos: -99,
                        template: 'commonTemplate',
                        slots: {
                            base: {
                                appName: '@portal/base',
                                kind: null,
                                props: {},
                            },
                        } as Record<string, any>,
                        meta: {},
                        versionId: 'v1.0.0',
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
                                props: {},
                            },
                        } as Record<string, any>,
                        meta: {},
                        versionId: 'v1.0.1',
                    },
                ],
            };

            const overrideConfig = {
                routes: [
                    {
                        route: '*',
                        orderPos: 1,
                        slots: {
                            override1: {
                                appName: '@portal/override1',
                                kind: null,
                                props: {},
                            },
                        } as Record<string, any>,
                    },
                    {
                        route: '*',
                        orderPos: 2,
                        slots: {
                            override2: {
                                appName: '@portal/override2',
                                kind: null,
                                props: {},
                            },
                        } as Record<string, any>,
                    },
                    {
                        route: '/const',
                        orderPos: 100,
                        slots: {
                            overrideConst: {
                                appName: '@portal/override-const',
                                kind: null,
                                props: {},
                            },
                        } as Record<string, any>,
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
                        slots: {
                            base: {
                                appName: '@portal/base',
                                kind: null,
                                props: {},
                            },
                        } as Record<string, any>,
                        meta: {},
                        versionId: 'v1.0.0',
                    },
                    {
                        route: '*',
                        orderPos: 1,
                        slots: {
                            override1: {
                                appName: '@portal/override1',
                                kind: null,
                                props: {},
                            },
                        } as Record<string, any>,
                    },
                    {
                        route: '*',
                        orderPos: 2,
                        slots: {
                            override2: {
                                appName: '@portal/override2',
                                kind: null,
                                props: {},
                            },
                        } as Record<string, any>,
                    },
                    {
                        routeId: 2,
                        route: '/const',
                        next: false,
                        orderPos: 100,
                        slots: {
                            const: {
                                appName: apps['@portal/const'].name,
                                kind: null,
                                props: {},
                            },
                            overrideConst: {
                                appName: '@portal/override-const',
                                kind: null,
                                props: {},
                            },
                        } as Record<string, any>,
                        meta: {},
                        versionId: 'v1.0.1',
                    },
                ],
            };

            expect(mergeConfigs(registryConfigWithWildcardRoutes, overrideConfig)).to.be.eql(mergedConfig);
        });
    });

    it('should add domain-specific override route when an original route with the same path exists', () => {
        const registryConfigWithRoute: TransformedRegistryConfig = {
            ...registryConfig,
            routes: [
                ...registryConfig.routes,
                {
                    routeId: 10,
                    route: '/page/*',
                    next: false,
                    orderPos: 200,
                    slots: {
                        body: {
                            appName: '@portal/default-app',
                            kind: 'primary',
                            props: {},
                        },
                    },
                    meta: {},
                    versionId: 'v1.0.10',
                },
            ],
        };

        const overrideConfig = {
            routes: [
                {
                    route: '/page/*',
                    slots: {
                        body: {
                            appName: '@portal/default-app',
                            props: {},
                        },
                    },
                },
                {
                    route: '/page/*',
                    template: 'domain-specific-template',
                    orderPos: 100,
                    domainId: 9,
                    slots: {
                        body: {
                            appName: '@portal/domain-specific-app',
                            props: {},
                        },
                    },
                },
            ],
        };

        const result = mergeConfigs(registryConfigWithRoute, overrideConfig, 9);

        const domainRoute = result.routes.find((r) => r.slots?.body?.appName === '@portal/domain-specific-app');
        expect(domainRoute).to.exist;
        expect(domainRoute!.template).to.equal('domain-specific-template');
        expect(domainRoute!.orderPos).to.equal(100);

        const defaultRoute = result.routes.find((r) => r.slots?.body?.appName === '@portal/default-app');
        expect(defaultRoute).to.exist;
    });

    it('should not merge non-domain override into domain-filtered original when a domain-specific override exists', () => {
        const registryConfigWithDomainRoute: TransformedRegistryConfig = {
            ...registryConfig,
            routes: [
                ...registryConfig.routes,
                {
                    routeId: 10,
                    route: '/page/*',
                    next: false,
                    template: 'domain-specific-template',
                    orderPos: 900,
                    slots: {
                        body: {
                            appName: '@portal/domain-specific-app',
                            kind: 'primary',
                            props: {},
                        },
                    },
                    meta: {},
                    versionId: 'v1.0.10',
                },
            ],
        };

        const overrideConfig = {
            routes: [
                {
                    route: '/page/*',
                    slots: {
                        body: {
                            appName: '@portal/default-app',
                            props: {},
                        },
                    },
                },
                {
                    route: '/page/*',
                    template: 'domain-specific-template',
                    orderPos: 900,
                    domainId: 9,
                    slots: {
                        body: {
                            appName: '@portal/domain-specific-app',
                            props: {},
                        },
                    },
                },
            ],
        };

        const result = mergeConfigs(registryConfigWithDomainRoute, overrideConfig, 9);

        const domainRoute = result.routes.find((r) => r.slots?.body?.appName === '@portal/domain-specific-app');
        expect(domainRoute).to.exist;
        expect(domainRoute!.template).to.equal('domain-specific-template');

        const corruptedRoute = result.routes.find(
            (r) => r.template === 'domain-specific-template' && r.slots?.body?.appName === '@portal/default-app',
        );
        expect(corruptedRoute).to.not.exist;
    });

    describe('should apply domain props to LDE-only apps', () => {
        const domainProps = { appProps: { brandId: 'namecheap' }, cdnUrl: 'https://cdn.namecheap.com' };
        const domainSsrProps = { secretKey: 'server-secret' };

        const registryConfigWithDomainProps: TransformedRegistryConfig = {
            ...registryConfig,
            domainProps,
            domainSsrProps,
        };

        it('should merge domain props into a new LDE-only app', () => {
            const overrideConfig = {
                apps: {
                    '@portal/new-lde-app': {
                        spaBundle: 'https://localhost:3000/app.js',
                        ssr: { src: 'https://localhost:3000/ssr' },
                        props: { appConfig: { lde: true } },
                    },
                },
            };

            const result = mergeConfigs(registryConfigWithDomainProps, overrideConfig);

            expect(result.apps['@portal/new-lde-app'].props).to.deep.equal({
                ...domainProps,
                appConfig: { lde: true },
            });
            expect(result.apps['@portal/new-lde-app'].ssrProps).to.deep.equal(domainSsrProps);
        });

        it('should let LDE app props override domain props for the same key', () => {
            const overrideConfig = {
                apps: {
                    '@portal/new-lde-app': {
                        spaBundle: 'https://localhost:3000/app.js',
                        props: { appProps: { brandId: 'override-brand' } },
                    },
                },
            };

            const result = mergeConfigs(registryConfigWithDomainProps, overrideConfig);

            expect(result.apps['@portal/new-lde-app'].props).to.deep.equal({
                ...domainProps,
                appProps: { brandId: 'override-brand' },
            });
        });

        it('should not apply domain props to apps already in the registry', () => {
            const overrideConfig = {
                apps: {
                    '@portal/will-change': {
                        spaBundle: 'https://localhost:3000/will-change.js',
                    },
                },
            };

            const result = mergeConfigs(registryConfigWithDomainProps, overrideConfig);

            expect(result.apps['@portal/will-change'].props).to.deep.equal(apps['@portal/will-change'].props);
        });

        it('should not apply domain props when registry config has no domainProps', () => {
            const overrideConfig = {
                apps: {
                    '@portal/new-lde-app': {
                        spaBundle: 'https://localhost:3000/app.js',
                        props: { foo: 'bar' },
                    },
                },
            };

            const result = mergeConfigs(registryConfig, overrideConfig);

            expect(result.apps['@portal/new-lde-app'].props).to.deep.equal({ foo: 'bar' });
        });
    });
});
