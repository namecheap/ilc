import chai from 'chai';
import sinon from 'sinon';
import html from 'nanohtml';

import ClientRouter from './ClientRouter';

describe('client router', () => {
    const apps = {
        '@portal/hero': {
            spaBundle: 'https://somewhere.com/heroSpaBundle.js',
            cssBundle: 'https://somewhere.com/heroCssBundle.css',
            dependencies: {
                heroFirstDependency: 'https://somewhere.com/heroFirstDependency.js',
                heroSecondDependency: 'https://somewhere.com/heroSecondDependency.js',
            },
            props: {
                heroFirstProp: {
                    firstPropOfHeroFirstProp: 'firstPropOfHeroFirstProp',
                    secondPropOfHeroFirstProp: {
                        firstPropOfSecondPropOfHeroFirstProp: 'firstPropOfSecondPropOfHeroFirstProp',
                        secondPropOfSecondPropOfHeroFirstProp: 'secondPropOfSecondPropOfHeroFirstProp',
                    },
                },
                heroSecondProp: 'heroSecondProp',
            },
            kind: 'primary',
            name: '@portal/hero',
            ssr: {
                timeout: 1000,
                src: '/hero',
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
            routeId: 'heroRoute',
            route: '/hero',
            next: false,
            slots: {
                hero: {
                    appName: apps['@portal/hero'].name,
                    props: {
                        heroFirstProp: {
                            secondPropOfHeroFirstProp: {
                                secondPropOfSecondPropOfHeroFirstProp: 'changedSecondPropOfSecondPropOfHeroFirstProp',
                            },
                            thirdPropOfHeroFirstProp: 'thirdPropOfHeroFirstProp',
                        },

                        heroSlotFirstProp: 'heroSlotFirstProp',
                        heroSlotSecondProp: {
                            firstPropOfHeroSlotSecondProp: 'firstPropOfHeroSlotSecondProp',
                        },
                    },
                },
            },
        },
    ];

    const specialRoutes = {
        '404': {
            routeId: 'errorsRoute',
            route: '/404',
            next: false,
            template: 'errorsTemplate',
            slots: {},
        },
    };

    const registryConfig = {
        apps,
        routes,
        specialRoutes,
    };

    const logger = {
        warn: sinon.spy(),
    };

    afterEach(() => {
        logger.warn.resetHistory();
    });

    describe('error throwing', () => {
        let router;

        beforeEach(() => {
            router = new ClientRouter(registryConfig, logger);
        });

        it('should throw an error when an app is not defined while getting route props', () => {
            chai.expect(router.getCurrentRouteProps.bind(router, '@portal/undefined', 'hero')).to.throw('Can not find info about the app.');
            chai.expect(router.getPrevRouteProps.bind(router, '@portal/undefined', 'hero')).to.throw('Can not find info about the app.');
        });

        it('should throw an error when a slot is not defined while getting route props', () => {
            chai.expect(router.getCurrentRouteProps.bind(router, '@portal/hero', 'undefined')).to.throw('Can not find info about the slot');
            chai.expect(router.getPrevRouteProps.bind(router, '@portal/hero', 'undefined')).to.throw('Can not find info about the slot');
        });
    });

    describe('when client router is going to init', () => {
        it('should set initial routes based on location when <base> tag is not defined', () => {
            const location = {
                pathname: '/hero',
                search: '?hi=there',
            };

            const mainRef = html`
                <main>
                    <div>Hi there! I do not have a base tag, so router should initialize based on location.</div>
                </main>getCurrentRoute
            `;

            document.body.appendChild(mainRef);

            const expectedRoute = {
                routeId: 'heroRoute',
                route: '/hero',
                basePath: '/hero',
                reqUrl: location.pathname + location.search,
                template: 'commonTemplate',
                specialRole: null,
                slots: {
                    ...registryConfig.routes[1].slots,
                },
            };

            const expectedRouteProps = {
                heroFirstProp: {
                    firstPropOfHeroFirstProp: 'firstPropOfHeroFirstProp',
                    secondPropOfHeroFirstProp: {
                        firstPropOfSecondPropOfHeroFirstProp: 'firstPropOfSecondPropOfHeroFirstProp',
                        secondPropOfSecondPropOfHeroFirstProp: 'changedSecondPropOfSecondPropOfHeroFirstProp',
                    },
                    thirdPropOfHeroFirstProp: 'thirdPropOfHeroFirstProp',
                },
                heroSecondProp: 'heroSecondProp',

                heroSlotFirstProp: 'heroSlotFirstProp',
                heroSlotSecondProp: {
                    firstPropOfHeroSlotSecondProp: 'firstPropOfHeroSlotSecondProp',
                },
            };

            const router = new ClientRouter(registryConfig, logger, location);

            chai.expect(router.getCurrentRoute()).to.be.eql(expectedRoute);
            chai.expect(router.getPrevRoute()).to.be.eql(expectedRoute);

            chai.expect(router.getCurrentRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);
            chai.expect(router.getPrevRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);
        });

        it('should remove <base> tag when this tag exists and set initial routes based on <base> tag', () => {
            const reqUrl = '/hero?hi=there';
            const mainRef = html`
                <main>
                    <div>Hi there! I have a base tag, so router should initialize based on href of the base tag.</div>
                    <base href="${reqUrl}">
                </main>
            `;

            document.body.appendChild(mainRef);

            const expectedRoute = {
                routeId: 'heroRoute',
                route: '/hero',
                basePath: '/hero',
                reqUrl,
                template: 'commonTemplate',
                specialRole: null,
                slots: {
                    ...registryConfig.routes[1].slots,
                },
            };

            const expectedRouteProps = {
                heroFirstProp: {
                    firstPropOfHeroFirstProp: 'firstPropOfHeroFirstProp',
                    secondPropOfHeroFirstProp: {
                        firstPropOfSecondPropOfHeroFirstProp: 'firstPropOfSecondPropOfHeroFirstProp',
                        secondPropOfSecondPropOfHeroFirstProp: 'changedSecondPropOfSecondPropOfHeroFirstProp',
                    },
                    thirdPropOfHeroFirstProp: 'thirdPropOfHeroFirstProp',
                },
                heroSecondProp: 'heroSecondProp',

                heroSlotFirstProp: 'heroSlotFirstProp',
                heroSlotSecondProp: {
                    firstPropOfHeroSlotSecondProp: 'firstPropOfHeroSlotSecondProp',
                },
            };

            const router = new ClientRouter(registryConfig, logger);

            chai.expect(mainRef.getElementsByTagName('base')).to.be.empty;

            chai.expect(router.getCurrentRoute()).to.be.eql(expectedRoute);
            chai.expect(router.getPrevRoute()).to.be.eql(expectedRoute);

            chai.expect(router.getCurrentRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);
            chai.expect(router.getPrevRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);
        });
    });
});
