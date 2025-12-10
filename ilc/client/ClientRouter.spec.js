import chai from 'chai';
import sinon from 'sinon';
import html from 'nanohtml';

import ClientRouter from './ClientRouter';
import { slotWillBe } from './TransitionManager/TransitionManager';
import ilcEvents from './constants/ilcEvents';
import { getIlcConfigRoot } from './configuration/getIlcConfigRoot';

describe('client router', () => {
    const singleSpa = {
        navigateToUrl: () => {},
        triggerAppChange: () => {},
        getMountedApps: () => [],
    };

    const handlePageTransaction = () => {};

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
        '@portal/opponent': {
            spaBundle: 'https://somewhere.com/opponentSpaBundle.js',
            cssBundle: 'https://somewhere.com/opponentCssBundle.css',
            dependencies: {
                opponentFirstDependency: 'https://somewhere.com/opponentFirstDependency.js',
                opponentSecondDependency: 'https://somewhere.com/opponentSecondDependency.js',
            },
            props: {
                opponentFirstProp: {
                    firstPropOfOpponentFirstProp: 'firstPropOfOpponentFirstProp',
                },
                opponentSecondProp: 'opponentSecondProp',
            },
            kind: 'primary',
            name: '@portal/opponent',
            ssr: {
                timeout: 5000,
                src: '/opponent',
            },
        },
    };

    const routes = [
        {
            route: '*',
            next: true,
            template: 'commonTemplate',
            slots: {},
        },
        {
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
        {
            route: '/opponent',
            next: false,
            slots: {
                opponent: {
                    appName: apps['@portal/opponent'].name,
                    props: {
                        opponentSlotFirstProp: 'opponentSlotFirstProp',
                        opponentSlotSecondProp: {
                            firstPropOfOpponentSlotSecondProp: 'firstPropOfOpponentSlotSecondProp',
                        },
                    },
                },
            },
        },
        {
            route: '/base',
            next: false,
            template: 'baseTemplate',
            slots: {
                opponent: {
                    appName: apps['@portal/opponent'].name,
                },
                hero: {
                    appName: apps['@portal/hero'].name,
                },
            },
        },
        {
            route: '/',
            next: false,
            template: 'baseTemplate',
            slots: {
                opponent: {
                    appName: apps['@portal/opponent'].name,
                },
                hero: {
                    appName: apps['@portal/hero'].name,
                },
            },
        },
    ];

    const specialRoutes = {
        404: {
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

    let router, configRoot;

    before(() => {
        configRoot = getIlcConfigRoot();
        sinon.stub(configRoot, 'registryConfiguration').value(registryConfig);
    });

    after(() => {
        sinon.stub(configRoot, 'registryConfiguration').restore();
    });

    afterEach(async () => {
        document.body.innerHTML = '';
        if (router) {
            router.removeEventListeners();
        }
        /**
         * Allow pending events to be emitted to not break other tests
         * single-spa patches window to emit popstate event on history and location actions from other tests like ClientRouter
         * https://single-spa.js.org/docs/api#popstateevent
         * This could not be easily cleared and karma runs all test suites in single context
         * TODO switch to jest or another test framework with proper test isolation
         */
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    describe('should set initial routes while client router is initializing', () => {
        it('should set initial routes based on location when <base> tag is not defined', () => {
            const location = {
                pathname: registryConfig.routes[1].route,
                search: '?hi=there',
            };

            const mainRef = html`
                <main>
                    <div>Hi there! I do not have a base tag, so client router should initialize based on location.</div>
                </main>
            `;

            document.body.appendChild(mainRef);

            const expectedRoute = {
                route: location.pathname,
                basePath: location.pathname,
                reqUrl: location.pathname + location.search,
                template: registryConfig.routes[0].template,
                specialRole: null,
                slots: {
                    ...registryConfig.routes[1].slots,
                },
                meta: {},
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

            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, location);

            chai.expect(router.getCurrentRoute()).to.be.eql(expectedRoute);
            chai.expect(router.getPrevRoute()).to.be.eql(expectedRoute);

            chai.expect(router.getCurrentRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);
            chai.expect(router.getPrevRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);
        });

        it('should remove <base> tag when this tag exists and set initial routes based on <base> tag', () => {
            const logger = {
                warn: sinon.spy(),
            };

            const location = {
                pathname: registryConfig.routes[2].route,
                search: '?see=you',
            };

            const reqUrl = `${registryConfig.routes[1].route}?hi=there`;
            const mainRef = html`
                <main>
                    <div>
                        Hi there! I have a base tag, so client router should initialize based on href of the base tag.
                    </div>
                    <base href="${reqUrl}" />
                </main>
            `;

            document.body.appendChild(mainRef);

            const expectedRoute = {
                route: registryConfig.routes[1].route,
                basePath: registryConfig.routes[1].route,
                reqUrl,
                template: registryConfig.routes[0].template,
                specialRole: null,
                slots: {
                    ...registryConfig.routes[1].slots,
                },
                meta: {},
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

            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, location, logger);

            chai.expect(mainRef.getElementsByTagName('base')).to.be.empty;

            chai.expect(router.getCurrentRoute()).to.be.eql(expectedRoute);
            chai.expect(router.getPrevRoute()).to.be.eql(expectedRoute);

            chai.expect(router.getCurrentRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);
            chai.expect(router.getPrevRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);

            chai.expect(
                logger.warn.calledOnceWithExactly(
                    'ILC: <base> tag was used only for initial rendering and removed afterwards.\n' +
                        'Currently, ILC does not support it fully.\n' +
                        'Please open an issue if you need this functionality.',
                ),
            ).to.be.true;
        });
    });

    describe(`should listen to ${ilcEvents.BEFORE_ROUTING} event when client routes was initialized`, () => {
        let singleSpaBeforeRoutingEvent;

        const singleSpaBeforeRoutingEventName = ilcEvents.BEFORE_ROUTING;

        beforeEach(() => {
            singleSpaBeforeRoutingEvent = new Event(singleSpaBeforeRoutingEventName);
        });

        it('should update a current route when it does not equal current URL', () => {
            const location = {
                pathname: registryConfig.routes[1].route,
                search: '?hi=there',
            };

            const expectedPrevRoute = {
                route: location.pathname,
                basePath: location.pathname,
                reqUrl: location.pathname + location.search,
                template: registryConfig.routes[0].template,
                specialRole: null,
                slots: {
                    ...registryConfig.routes[1].slots,
                },
                meta: {},
            };

            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, location);

            location.pathname = registryConfig.routes[2].route;
            location.search = '?see=you';

            const expectedCurrentRoute = {
                route: location.pathname,
                basePath: location.pathname,
                reqUrl: location.pathname + location.search,
                template: registryConfig.routes[0].template,
                specialRole: null,
                slots: {
                    ...registryConfig.routes[2].slots,
                },
                meta: {},
            };

            window.dispatchEvent(singleSpaBeforeRoutingEvent);

            chai.expect(router.getCurrentRoute()).to.be.eql(expectedCurrentRoute);
            chai.expect(router.getPrevRoute()).to.be.eql(expectedPrevRoute);
        });

        it('should not update a current route when a route was not changed', () => {
            const location = {
                pathname: registryConfig.routes[1].route,
                search: '?hi=there',
            };

            const expectedRoute = {
                route: location.pathname,
                basePath: location.pathname,
                reqUrl: location.pathname + location.search,
                template: registryConfig.routes[0].template,
                specialRole: null,
                slots: {
                    ...registryConfig.routes[1].slots,
                },
                meta: {},
            };

            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, location);

            window.dispatchEvent(singleSpaBeforeRoutingEvent);

            chai.expect(router.getCurrentRoute()).to.be.eql(expectedRoute);
            chai.expect(router.getPrevRoute()).to.be.eql(expectedRoute);
        });

        it('should throw an error when a base template changed', () => {
            const addEventListener = sinon.spy(window, 'addEventListener');

            try {
                const location = {
                    pathname: registryConfig.routes[1].route,
                    search: '?hi=there',
                };

                router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, location);

                const [eventName, eventListener] = addEventListener.getCall(0).args;

                location.pathname = registryConfig.routes[3].route;
                location.search = '?throw=error';

                eventListener();

                chai.expect(location.href).to.be.eql(registryConfig.routes[3].route + '?throw=error');
            } finally {
                addEventListener.restore();
            }
        });
    });

    describe('should listen to anchors click events when client router was initialized', () => {
        let clickEvent;

        const singleSpa = {
            navigateToUrl: sinon.spy(),
        };

        beforeEach(() => {
            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction);
            clickEvent = new Event('click', {
                bubbles: true,
                cancelable: true,
            });
        });

        afterEach(() => {
            singleSpa.navigateToUrl.resetHistory();
        });

        it('should handle click events on anchors and navigate to a registered micro front-end page', () => {
            const anchor = {
                id: 'click-me',
                href: registryConfig.routes[2].route,
            };

            anchor.ref = html`
                <a id="${anchor.id}" href="${anchor.href}">
                    Hi there! I am anchor tag and I have href attribute. So I should forward you to registered micro
                    front-end page.
                </a>
            `;

            document.body.appendChild(anchor.ref);
            document.getElementById(anchor.id).dispatchEvent(clickEvent);

            chai.expect(singleSpa.navigateToUrl.calledOnceWithExactly(anchor.href)).to.be.true;
            chai.expect(clickEvent.defaultPrevented).to.be.true;
        });

        it('should handle click events on "http(s)://domain" anchors if we have "/" route', () => {
            const anchor = {
                id: 'click-me',
                href: location.origin,
            };

            anchor.ref = html`
                <a id="${anchor.id}" href="${anchor.href}">
                    Hi there! I am anchor tag and I have href attribute. So I should forward you to registered micro
                    front-end page.
                </a>
            `;

            document.body.appendChild(anchor.ref);
            document.getElementById(anchor.id).dispatchEvent(clickEvent);

            chai.expect(singleSpa.navigateToUrl.calledOnceWithExactly(anchor.href)).to.be.true;
            chai.expect(clickEvent.defaultPrevented).to.be.true;
        });

        it('should NOT handle click events on anchors when anchors do not have href attribute', () => {
            const anchor = {
                id: 'click-me',
            };

            anchor.ref = html`
                <a id="${anchor.id}">
                    Hi there! I am anchor tag and I do not have href attribute. So I should not forward you to a
                    registered micro front-end page.
                </a>
            `;

            document.body.appendChild(anchor.ref);
            document.getElementById(anchor.id).dispatchEvent(clickEvent);

            chai.expect(singleSpa.navigateToUrl.called).to.be.false;
            chai.expect(clickEvent.defaultPrevented).to.be.false;
        });

        it('should NOT handle click events on anchors when these events were already default prevented', () => {
            const anchor = {
                id: 'click-me',
                href: registryConfig.routes[2].route,
            };

            anchor.ref = html`
                <a href="${anchor.href}">
                    <span id="${anchor.id}">
                        Hi there! I am span tag and I have the closest anchor tag that has href attribute. But event
                        click is going to be prevented previously. So I should not forward you to registered micro
                        front-end page.
                    </span>
                </a>
            `;

            document.body.appendChild(anchor.ref);
            clickEvent.preventDefault();
            document.getElementById(anchor.id).dispatchEvent(clickEvent);

            chai.expect(singleSpa.navigateToUrl.called).to.be.false;
        });

        it('should NOT handle click events on anchors when anchors are not going to a registered micro front-end page', () => {
            const anchor = {
                id: 'click-me',
                href: '/undefined',
            };

            anchor.ref = html`
                <a href="${anchor.href}">
                    <span id="${anchor.id}">
                        Hi there! I am span tag and I have the closest anchor tag that has href attribute. But event
                        click is going to be prevented previously. So I should not forward you to registered micro
                        front-end page.
                    </span>
                </a>
            `;

            document.body.appendChild(anchor.ref);
            document.getElementById(anchor.id).dispatchEvent(clickEvent);

            chai.expect(singleSpa.navigateToUrl.called).to.be.false;
            chai.expect(clickEvent.defaultPrevented).to.be.false;
        });

        it('should NOT handle click events on anchors with target="_blank"', () => {
            const anchor = {
                id: 'click-me',
            };

            anchor.ref = html`
                <a id="${anchor.id}" target="_blank">
                    Hi there! I am anchor tag and I do have target="_blank" attribute.
                </a>
            `;

            document.body.appendChild(anchor.ref);
            document.getElementById(anchor.id).dispatchEvent(clickEvent);

            chai.expect(singleSpa.navigateToUrl.called).to.be.false;
            chai.expect(clickEvent.defaultPrevented).to.be.false;
        });

        describe('should NOT handle click events on with pressed:', () => {
            let anchor;
            const pageReloadPreventer = (e) => {
                if (e instanceof MouseEvent && e.target === anchor.ref) {
                    e.preventDefault();
                }
            };

            beforeEach(() => {
                window.addEventListener('click', pageReloadPreventer);

                anchor = {
                    id: 'click-me',
                    href: registryConfig.routes[2].route,
                };

                anchor.ref = html` <a id="${anchor.id}" href="${anchor.href}"> Hi there! I am an anchor tag. </a> `;

                document.body.appendChild(anchor.ref);
            });

            afterEach(() => {
                window.removeEventListener('click', pageReloadPreventer);
            });

            for (const keyType of ['metaKey', 'altKey', 'ctrlKey', 'shiftKey']) {
                it(`${keyType} key`, () => {
                    clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        [keyType]: true,
                    });

                    document.getElementById(anchor.id).dispatchEvent(clickEvent);

                    chai.expect(singleSpa.navigateToUrl.called).to.be.false;
                });
            }
        });
    });

    describe('while getting route props', () => {
        beforeEach(() => {
            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction);
        });

        it('should throw an error when an app is not defined', () => {
            chai.expect(router.getCurrentRouteProps.bind(router, '@portal/undefined', 'hero')).to.throw(
                'Can not find info about the app.',
            );
            chai.expect(router.getPrevRouteProps.bind(router, '@portal/undefined', 'hero')).to.throw(
                'Can not find info about the app.',
            );
        });

        it('should throw an error when a slot is not defined', () => {
            chai.expect(router.getCurrentRouteProps.bind(router, '@portal/hero', 'undefined')).to.throw(
                'Can not find info about the slot',
            );
            chai.expect(router.getPrevRouteProps.bind(router, '@portal/hero', 'undefined')).to.throw(
                'Can not find info about the slot',
            );
        });
    });

    describe('when i18n was provided', () => {
        const singleSpa = {
            navigateToUrl: sinon.spy(),
        };

        const i18n = {
            unlocalizeUrl: sinon.stub().callsFake((url) => url),
            localizeUrl: sinon.stub().callsFake((url) => url),
        };

        beforeEach(() => {
            i18n.unlocalizeUrl.callsFake((url) => url);
            i18n.localizeUrl.callsFake((url) => url);

            router = new ClientRouter(configRoot, {}, i18n, singleSpa, handlePageTransaction);
        });

        afterEach(() => {
            i18n.unlocalizeUrl.reset();
            i18n.localizeUrl.reset();

            singleSpa.navigateToUrl.resetHistory();
        });

        it('should unlocalize an URL before matching a route', () => {
            const localizedUrl = '/ua/hero';
            const unlocalizedUrl = '/hero';

            i18n.unlocalizeUrl.withArgs(localizedUrl).returns(unlocalizedUrl);

            const route = router.match(window.location.origin + localizedUrl);

            chai.expect(i18n.unlocalizeUrl.calledWithExactly(localizedUrl));
            chai.expect(route.reqUrl).to.be.eql(unlocalizedUrl);
        });

        it('should localize an URL before navigate', () => {
            const localizedUrl = window.location.origin + '/ua/opponent';
            const unlocalizedUrl = window.location.origin + '/opponent';

            i18n.localizeUrl.withArgs(unlocalizedUrl).returns(localizedUrl);

            router.navigateToUrl(unlocalizedUrl);

            chai.expect(singleSpa.navigateToUrl.calledWithExactly(localizedUrl));
        });
    });

    describe(`should listen to "${ilcEvents.NOT_FOUND}"`, () => {
        const logger = {
            info: sinon.spy(),
            warn: sinon.spy(),
        };

        const singleSpa = {
            getMountedApps: () => ['mounted_app__at__some_place', 'hero__at__some_place'],
        };

        let beforeRoutingHandler;

        afterEach(() => {
            logger.info.resetHistory();
            logger.warn.resetHistory();
            if (beforeRoutingHandler) {
                window.removeEventListener(ilcEvents.BEFORE_ROUTING, beforeRoutingHandler);
                beforeRoutingHandler = null;
            }
        });

        it('should ignore not mounted fragments', () => {
            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

            const appId = 'not_mounted_app__at__some_place';

            window.dispatchEvent(
                new CustomEvent(ilcEvents.NOT_FOUND, {
                    detail: { appId },
                }),
            );

            sinon.assert.calledWithExactly(
                logger.warn,
                `ILC: Ignoring special route "404" trigger which came from not mounted app "${appId}". Currently mounted apps: ${singleSpa
                    .getMountedApps()
                    .join(', ')}.`,
            );
        });

        it('should ignore non-primary fragments', () => {
            const nonPrimaryKind = 'regular';
            const appId = 'mounted_app__at__some_place';
            const configRoot = getIlcConfigRoot();
            const registryConfiguration = {
                ...registryConfig,
                apps: {
                    ...registryConfig.apps,
                    '@portal/mounted_app': {
                        kind: nonPrimaryKind,
                    },
                },
            };
            sinon.stub(configRoot, 'registryConfiguration').value(registryConfiguration);

            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

            window.dispatchEvent(
                new CustomEvent(ilcEvents.NOT_FOUND, {
                    detail: { appId },
                }),
            );

            sinon.assert.calledWithExactly(
                logger.warn,
                `ILC: Ignoring special route "404" trigger which came from non-primary app "${appId}". "${appId}" is "${nonPrimaryKind}"`,
            );
        });

        it(`should handle ${ilcEvents.NOT_FOUND} successfully`, () => {
            beforeRoutingHandler = sinon.spy();
            window.addEventListener(ilcEvents.BEFORE_ROUTING, beforeRoutingHandler);

            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, {}, logger);

            const appId = 'hero__at__some_place';

            window.dispatchEvent(
                new CustomEvent(ilcEvents.NOT_FOUND, {
                    detail: { appId },
                }),
            );

            sinon.assert.calledWithExactly(
                logger.info,
                `ILC: Special route "404" was triggered by "${appId}" app. Performing rerouting...`,
            );
            sinon.assert.calledOnce(beforeRoutingHandler);
        });
    });

    describe('is active factory', () => {
        const dispatchIlcPageReadyEvent = () => window.dispatchEvent(new Event(ilcEvents.PAGE_READY));

        const handlePageTransaction = sinon.spy();
        const logger = {
            info: sinon.spy(),
        };

        const isActiveHero = () => router.isAppWithinSlotActive('@portal/hero', 'hero');
        const isActiveOpponent = () => router.isAppWithinSlotActive('@portal/opponent', 'opponent');

        afterEach(() => {
            handlePageTransaction.resetHistory();
            logger.info.resetHistory();
        });

        it('should return false when a slot is going to be removed', () => {
            history.replaceState({}, undefined, '/opponent');
            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

            history.replaceState({}, undefined, '/hero');
            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.rendered, 'primary');
            handlePageTransaction.resetHistory();

            history.replaceState({}, undefined, '/opponent');
            chai.expect(isActiveHero()).to.be.eql(false);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.removed, 'primary');
            handlePageTransaction.resetHistory();
        });

        it('should return true when a slot is going to be rendered', () => {
            history.replaceState({}, undefined, '/opponent');
            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

            history.replaceState({}, undefined, '/opponent');
            chai.expect(isActiveHero()).to.be.eql(false);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.default, 'primary');
            handlePageTransaction.resetHistory();

            history.replaceState({}, undefined, '/hero');
            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.rendered, 'primary');
            handlePageTransaction.resetHistory();
        });

        it('should return always true when a slot exists on both routes', () => {
            history.replaceState({}, undefined, '/');
            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

            history.replaceState({}, undefined, '/base');
            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.default, 'primary');
            handlePageTransaction.resetHistory();

            history.replaceState({}, undefined, '/');
            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.default, 'primary');
            handlePageTransaction.resetHistory();
        });

        it('should rerender app on change props with the help of unmounting and mounting', () => {
            const customRegistryConfig = {
                ...registryConfig,
                routes: [
                    ...routes.filter((n) => n.route !== '/hero'),
                    {
                        route: '/hero',
                        next: false,
                        template: 'baseTemplate', // the ame template
                        slots: {
                            hero: {
                                appName: apps['@portal/hero'].name,
                                props: {
                                    // another props
                                    newPropsKey: 'newPropsValue',
                                },
                            },
                        },
                    },
                ],
            };

            const configRoot = getIlcConfigRoot();
            sinon.stub(configRoot, 'registryConfiguration').value(customRegistryConfig);

            history.replaceState({}, undefined, '/');
            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

            history.replaceState({}, undefined, '/base');

            // the same slot so nothing changed
            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.default, 'primary');
            handlePageTransaction.resetHistory();

            history.replaceState({}, undefined, '/hero');

            // remove slot with old props
            chai.expect(isActiveHero()).to.be.eql(false);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.removed, 'primary');
            handlePageTransaction.resetHistory();

            // trigger rerender, just to render previously removed fragments
            dispatchIlcPageReadyEvent();
            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.default, 'primary');
            handlePageTransaction.resetHistory();

            sinon.assert.calledWithExactly(
                logger.info,
                `ILC: Triggering app re-mount for [@portal/hero] due to changed props.`,
            );
        });

        it('should rerender app on change props with the help of updating app (w/o unmounting app)', () => {
            const customRegistryConfig = {
                ...registryConfig,
                routes: [
                    ...routes.filter((n) => n.route !== '/hero'),
                    {
                        route: '/hero',
                        next: false,
                        template: 'baseTemplate', // the ame template
                        slots: {
                            hero: {
                                appName: apps['@portal/hero'].name,
                                props: {
                                    // another props
                                    newPropsKey: 'newPropsValue',
                                },
                            },
                        },
                    },
                ],
            };

            const configRoot = getIlcConfigRoot();
            sinon.stub(configRoot, 'registryConfiguration').value(customRegistryConfig);

            history.replaceState({}, undefined, '/');
            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

            // mock listening "update" event from hero
            const eventNameUpdateHero = ilcEvents.updateAppInSlot('hero', '@portal/hero');
            const eventHandlerUpdateHero = sinon.spy();
            router.addListener(eventNameUpdateHero, eventHandlerUpdateHero);

            history.replaceState({}, undefined, '/base');

            // the same slot so nothing changed
            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.default, 'primary');
            handlePageTransaction.resetHistory();

            history.replaceState({}, undefined, '/hero');

            // in case of "updating" we don't remove fragment, just update it with new props
            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.calledOnceWithExactly(handlePageTransaction, 'hero', slotWillBe.default, 'primary');
            handlePageTransaction.resetHistory();

            sinon.assert.notCalled(logger.info);
            sinon.assert.notCalled(eventHandlerUpdateHero);

            dispatchIlcPageReadyEvent();

            sinon.assert.calledOnce(eventHandlerUpdateHero);
        });

        it('should replace apps and update props with different values only at the same time to avoid inconsistency in behaviour', () => {
            const customRegistryConfig = {
                ...registryConfig,
                routes: [
                    ...routes,
                    {
                        route: '/update_hero-and-replace_opponent',
                        next: false,
                        template: 'baseTemplate',
                        slots: {
                            opponent: {
                                appName: apps['@portal/opponent'].name,
                                props: {
                                    newPropsKeyOpponent: 'newPropsValueOpponent',
                                },
                            },
                            hero: {
                                appName: apps['@portal/hero'].name,
                                props: {
                                    newPropsKeyHero: 'newPropsValueHero',
                                },
                            },
                        },
                    },
                ],
            };

            const configRoot = getIlcConfigRoot();
            sinon.stub(configRoot, 'registryConfiguration').value(customRegistryConfig);

            history.replaceState({}, undefined, '/');
            router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

            // mock listening "update" event ONLY for hero
            const eventNameUpdateHero = ilcEvents.updateAppInSlot('hero', '@portal/hero');
            const eventHandlerUpdateHero = sinon.spy();
            router.addListener(eventNameUpdateHero, eventHandlerUpdateHero);

            history.replaceState({}, undefined, '/update_hero-and-replace_opponent');

            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.notCalled(eventHandlerUpdateHero);
            chai.expect(isActiveOpponent()).to.be.eql(false);
            sinon.assert.notCalled(logger.info);

            dispatchIlcPageReadyEvent();

            chai.expect(isActiveHero()).to.be.eql(true);
            sinon.assert.calledOnce(eventHandlerUpdateHero);
            chai.expect(isActiveOpponent()).to.be.eql(true);
            sinon.assert.calledOnceWithExactly(
                logger.info,
                'ILC: Triggering app re-mount for [@portal/opponent] due to changed props.',
            );
        });
    });
});
