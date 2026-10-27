import * as chai from 'chai';
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

        it('does not add an appProps.experiments field when ilcState carries no experiments', () => {
            // router from beforeEach is built with empty ilcState ({}), so props are untouched
            chai.expect(router.getCurrentRouteProps('@portal/hero', 'hero').appProps).to.equal(undefined);
        });

        it('merges ilcState.experiments into appProps so client-side navigation carries the assignment', () => {
            const experiments = { 'homepage-hero': 'variant-b', 'example-experiment': 'variant-a' };
            // Rebuild the beforeEach router with experiments in ilcState. Reassign the
            // module-level `router` (after cleaning the empty one) so afterEach tears down
            // its window listeners — a local instance would leak handlers into later
            // navigation specs and trigger a full-page reload.
            router.removeEventListeners();
            router = new ClientRouter(configRoot, { experiments }, undefined, singleSpa, handlePageTransaction);

            // nested under `appProps` to match the server (server-router.js), so a client
            // consumer can read it via getCurrentPathProps().appProps on mount
            chai.expect(router.getCurrentRouteProps('@portal/hero', 'hero').appProps).to.be.eql({ experiments });
            chai.expect(router.getPrevRouteProps('@portal/hero', 'hero').appProps).to.be.eql({ experiments });
        });

        it('preserves the app/route own props alongside the injected experiments', () => {
            const experiments = { 'homepage-hero': 'variant-b' };
            router.removeEventListeners();
            router = new ClientRouter(configRoot, { experiments }, undefined, singleSpa, handlePageTransaction);

            const props = router.getCurrentRouteProps('@portal/hero', 'hero');
            // the app's own props must survive the merge — experiments are purely additive
            chai.expect(props.heroSecondProp).to.equal('heroSecondProp');
            chai.expect(props.heroFirstProp).to.be.an('object');
            chai.expect(props.appProps).to.be.eql({ experiments });
        });

        it('reuses the resolved assignment without re-bucketing (stable across current/prev and repeated calls)', () => {
            const experiments = { 'homepage-hero': 'variant-b' };
            router.removeEventListeners();
            router = new ClientRouter(configRoot, { experiments }, undefined, singleSpa, handlePageTransaction);

            // same resolved value every time — the client never re-evaluates the assignment
            chai.expect(router.getCurrentRouteProps('@portal/hero', 'hero').appProps.experiments).to.be.eql(
                experiments,
            );
            chai.expect(router.getCurrentRouteProps('@portal/hero', 'hero').appProps.experiments).to.be.eql(
                experiments,
            );
            chai.expect(router.getPrevRouteProps('@portal/hero', 'hero').appProps.experiments).to.be.eql(experiments);
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

describe('client router: several apps per slot', () => {
    const singleSpa = {
        navigateToUrl: () => {},
        triggerAppChange: () => {},
        getMountedApps: () => [],
    };

    const apps = {
        '@portal/core': { spaBundle: 'https://somewhere.com/core.js', kind: 'essential', props: {} },
        '@portal/inbox': { spaBundle: 'https://somewhere.com/inbox.js', kind: 'primary', props: {} },
        '@portal/calendar': { spaBundle: 'https://somewhere.com/calendar.js', kind: 'primary', props: {} },
    };

    const routes = [
        { route: '*', next: true, template: 'baseTemplate', slots: {} },
        {
            route: '/inbox',
            next: false,
            slots: {
                body: [
                    { appName: '@portal/core', props: { page: 'inbox' } },
                    { appName: '@portal/inbox', props: { folder: 'INBOX' } },
                ],
            },
        },
        {
            route: '/calendar',
            next: false,
            slots: {
                body: [
                    { appName: '@portal/core', props: { page: 'calendar' } },
                    { appName: '@portal/calendar', props: {} },
                ],
            },
        },
    ];

    const registryConfig = {
        apps,
        routes,
        specialRoutes: { 404: { next: false, template: 'errorsTemplate', slots: {} } },
    };
    const dispatchIlcPageReadyEvent = () => window.dispatchEvent(new Event(ilcEvents.PAGE_READY));

    let router, configRoot, handlePageTransaction, logger;

    const isActive = (appName) => router.isAppWithinSlotActive(appName, 'body');

    before(() => {
        configRoot = getIlcConfigRoot();
        sinon.stub(configRoot, 'registryConfiguration').value(registryConfig);
    });

    after(() => {
        sinon.stub(configRoot, 'registryConfiguration').restore();
    });

    beforeEach(() => {
        handlePageTransaction = sinon.spy();
        logger = { info: sinon.spy() };
    });

    afterEach(async () => {
        document.body.innerHTML = '';
        if (router) {
            router.removeEventListeners();
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it('treats every listed app as active and gives each its own props', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        chai.expect(isActive('@portal/core')).to.be.eql(true);
        chai.expect(isActive('@portal/inbox')).to.be.eql(true);
        chai.expect(isActive('@portal/calendar')).to.be.eql(false);

        chai.expect(router.getCurrentRouteProps('@portal/core', 'body')).to.be.eql({ page: 'inbox' });
        chai.expect(router.getCurrentRouteProps('@portal/inbox', 'body')).to.be.eql({ folder: 'INBOX' });
        chai.expect(() => router.getCurrentRouteProps('@portal/calendar', 'body')).to.throw(
            'Can not find info about the slot.',
        );
    });

    it('swaps only the apps that change between two lists of the same slot', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        // core has an "update" lifecycle: its props change in place, no remount
        router.addListener(ilcEvents.updateAppInSlot('body', '@portal/core'), () => {});

        history.replaceState({}, undefined, '/calendar');

        chai.expect(isActive('@portal/core')).to.be.eql(true);
        sinon.assert.calledWithExactly(handlePageTransaction, 'body', slotWillBe.default, 'essential');

        chai.expect(isActive('@portal/inbox')).to.be.eql(false);
        sinon.assert.calledWithExactly(handlePageTransaction, 'body', slotWillBe.removed, 'primary');

        chai.expect(isActive('@portal/calendar')).to.be.eql(true);
        sinon.assert.calledWithExactly(handlePageTransaction, 'body', slotWillBe.rendered, 'primary');
    });

    it('remounts one app of the list when its props change and it has no "update" lifecycle', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        history.replaceState({}, undefined, '/calendar');

        // core: removed for this pass only, its neighbours are untouched
        chai.expect(isActive('@portal/core')).to.be.eql(false);
        chai.expect(isActive('@portal/calendar')).to.be.eql(true);

        dispatchIlcPageReadyEvent();

        chai.expect(isActive('@portal/core')).to.be.eql(true);
        sinon.assert.calledWithExactly(
            logger.info,
            'ILC: Triggering app re-mount for [@portal/core] due to changed props.',
        );
    });

    it('reports the kind of the app entry, not of the slot', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        chai.expect(router.getRelevantAppKind('@portal/core', 'body')).to.be.eql('essential');
        chai.expect(router.getRelevantAppKind('@portal/inbox', 'body')).to.be.eql('primary');
    });
});

describe('client router: keep-alive slot entries', () => {
    const singleSpa = {
        navigateToUrl: () => {},
        triggerAppChange: () => {},
        getMountedApps: () => [],
    };

    const apps = {
        '@portal/inbox': { spaBundle: 'https://somewhere.com/inbox.js', kind: 'primary', props: {} },
        '@portal/calendar': { spaBundle: 'https://somewhere.com/calendar.js', kind: 'primary', props: {} },
    };

    const routes = [
        { route: '*', next: true, template: 'baseTemplate', slots: {} },
        {
            route: '/inbox',
            next: false,
            slots: { body: { appName: '@portal/inbox', keepAlive: true, props: { folder: 'INBOX' } } },
        },
        {
            route: '/inbox-sent',
            next: false,
            slots: { body: { appName: '@portal/inbox', keepAlive: true, props: { folder: 'Sent' } } },
        },
        { route: '/calendar', next: false, slots: { body: { appName: '@portal/calendar' } } },
        {
            route: '/inbox-archive',
            next: false,
            slots: { body: { appName: '@portal/inbox', props: { folder: 'INBOX' } } },
        },
    ];

    const registryConfig = {
        apps,
        routes,
        specialRoutes: { 404: { next: false, template: 'errorsTemplate', slots: {} } },
    };

    const inboxAppId = 'inbox__at__body';
    const dispatchIlcPageReadyEvent = () => window.dispatchEvent(new Event(ilcEvents.PAGE_READY));

    let router, configRoot, handlePageTransaction, logger, visibilityEvents, onVisibility, inboxContainer;

    const isActiveInbox = () => router.isAppWithinSlotActive('@portal/inbox', 'body');
    const isActiveCalendar = () => router.isAppWithinSlotActive('@portal/calendar', 'body');

    before(() => {
        configRoot = getIlcConfigRoot();
        sinon.stub(configRoot, 'registryConfiguration').value(registryConfig);
    });

    after(() => {
        sinon.stub(configRoot, 'registryConfiguration').restore();
    });

    beforeEach(() => {
        handlePageTransaction = sinon.spy();
        logger = { info: sinon.spy() };
        visibilityEvents = [];
        onVisibility = (event) => visibilityEvents.push(event.detail);
        window.addEventListener(ilcEvents.APP_VISIBILITY, onVisibility);

        const slot = document.createElement('div');
        slot.id = 'keep-alive-slot-host';
        inboxContainer = document.createElement('div');
        inboxContainer.setAttribute('data-ilc-app-id', inboxAppId);
        slot.appendChild(inboxContainer);
        document.body.appendChild(slot);
    });

    afterEach(async () => {
        window.removeEventListener(ilcEvents.APP_VISIBILITY, onVisibility);
        document.body.innerHTML = '';
        if (router) {
            router.removeEventListeners();
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it('keeps a kept-alive app active and hides its container when another app takes the slot', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        history.replaceState({}, undefined, '/calendar');

        chai.expect(isActiveInbox()).to.be.eql(true);
        sinon.assert.calledOnceWithExactly(handlePageTransaction, 'body', slotWillBe.default, 'primary');
        chai.expect(inboxContainer.style.display).to.be.eql('none');
        chai.expect(visibilityEvents).to.be.eql([
            { appId: inboxAppId, appName: '@portal/inbox', slotName: 'body', visible: false },
        ]);

        handlePageTransaction.resetHistory();
        chai.expect(isActiveCalendar()).to.be.eql(true);
        sinon.assert.calledOnceWithExactly(handlePageTransaction, 'body', slotWillBe.rendered, 'primary');
    });

    it('shows a kept-alive app again without a remount when a route lists it again', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        history.replaceState({}, undefined, '/calendar');
        isActiveInbox();
        isActiveCalendar();
        handlePageTransaction.resetHistory();

        history.replaceState({}, undefined, '/inbox');

        chai.expect(isActiveInbox()).to.be.eql(true);
        sinon.assert.calledOnceWithExactly(handlePageTransaction, 'body', slotWillBe.default, 'primary');
        chai.expect(inboxContainer.style.display).to.be.eql('');
        chai.expect(visibilityEvents[visibilityEvents.length - 1]).to.be.eql({
            appId: inboxAppId,
            appName: '@portal/inbox',
            slotName: 'body',
            visible: true,
        });

        handlePageTransaction.resetHistory();
        chai.expect(isActiveCalendar()).to.be.eql(false);
        sinon.assert.calledOnceWithExactly(handlePageTransaction, 'body', slotWillBe.removed, 'primary');
    });

    it('keeps the last route props of a hidden app', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        history.replaceState({}, undefined, '/calendar');
        isActiveInbox();

        chai.expect(router.getCurrentRouteProps('@portal/inbox', 'body')).to.be.eql({ folder: 'INBOX' });
    });

    it('keeps the base path of a hidden app, while the visible app gets the current one', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);
        const inboxBasePath = router.getCurrentRoute().basePath;

        history.replaceState({}, undefined, '/calendar');
        isActiveInbox();
        const calendarBasePath = router.getCurrentRoute().basePath;

        chai.expect(calendarBasePath).to.not.be.eql(inboxBasePath);
        chai.expect(router.getCurrentBasePath('@portal/inbox', 'body')).to.be.eql(inboxBasePath);
        chai.expect(router.getCurrentBasePath('@portal/calendar', 'body')).to.be.eql(calendarBasePath);
    });

    it('dispatches one visibility event per change, however often the activity function runs', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        history.replaceState({}, undefined, '/calendar');
        isActiveInbox();
        isActiveInbox();
        isActiveInbox();
        chai.expect(visibilityEvents.map((event) => event.visible)).to.be.eql([false]);

        history.replaceState({}, undefined, '/inbox');
        isActiveInbox();
        isActiveInbox();
        chai.expect(visibilityEvents.map((event) => event.visible)).to.be.eql([false, true]);
    });

    it('unmounts a kept-alive app when it leaves a route that does not keep it alive', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        history.replaceState({}, undefined, '/calendar');
        isActiveInbox();
        isActiveCalendar();

        // the app comes back on a route that lists it without keepAlive: shown, no remount
        history.replaceState({}, undefined, '/inbox-archive');
        chai.expect(isActiveInbox()).to.be.eql(true);
        chai.expect(inboxContainer.style.display).to.be.eql('');
        isActiveCalendar();
        handlePageTransaction.resetHistory();

        // leaving that route unmounts it like any other app: no hide, no third visibility event
        history.replaceState({}, undefined, '/calendar');
        chai.expect(isActiveInbox()).to.be.eql(false);
        chai.expect(isActiveInbox()).to.be.eql(false); // activity functions run more than once per change
        sinon.assert.calledWithExactly(handlePageTransaction, 'body', slotWillBe.removed, 'primary');
        chai.expect(inboxContainer.style.display).to.be.eql('');
        chai.expect(visibilityEvents.map((event) => event.visible)).to.be.eql([false, true]);
    });

    it('reuses the same container over many hide and show cycles and adds nothing to the DOM', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);
        const slot = inboxContainer.parentNode;

        for (let cycle = 0; cycle < 50; cycle++) {
            history.replaceState({}, undefined, '/calendar');
            isActiveInbox();
            isActiveCalendar();
            history.replaceState({}, undefined, '/inbox');
            isActiveInbox();
            isActiveCalendar();
        }

        chai.expect(slot.querySelectorAll(`[data-ilc-app-id="${inboxAppId}"]`).length).to.be.eql(1);
        chai.expect(slot.querySelector(`[data-ilc-app-id="${inboxAppId}"]`)).to.equal(inboxContainer);
        chai.expect(slot.childNodes.length).to.be.eql(1);
        chai.expect(inboxContainer.style.display).to.be.eql('');
        chai.expect(visibilityEvents.length).to.be.eql(100);
    });

    it('remounts a kept-alive app when a route lists it again with other props and no "update" lifecycle', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        history.replaceState({}, undefined, '/calendar');
        isActiveInbox();
        isActiveCalendar();
        handlePageTransaction.resetHistory();

        history.replaceState({}, undefined, '/inbox-sent');

        chai.expect(isActiveInbox()).to.be.eql(false);
        sinon.assert.calledOnceWithExactly(handlePageTransaction, 'body', slotWillBe.default, 'primary');
        handlePageTransaction.resetHistory();

        // page ready re-runs the routing: the app is listed again, not kept alive any more, and
        // single-spa mounts it fresh (same path as the existing "re-mount due to changed props")
        dispatchIlcPageReadyEvent();

        chai.expect(isActiveInbox()).to.be.eql(true);
        sinon.assert.calledOnceWithExactly(handlePageTransaction, 'body', slotWillBe.default, 'primary');
        sinon.assert.calledWithExactly(
            logger.info,
            'ILC: Triggering app re-mount for [@portal/inbox] due to changed props.',
        );
    });

    it('updates a kept-alive app in place when it has an "update" lifecycle and comes back with other props', () => {
        history.replaceState({}, undefined, '/inbox');
        router = new ClientRouter(configRoot, {}, undefined, singleSpa, handlePageTransaction, undefined, logger);

        const onUpdate = sinon.spy();
        router.addListener(ilcEvents.updateAppInSlot('body', '@portal/inbox'), onUpdate);

        history.replaceState({}, undefined, '/calendar');
        isActiveInbox();
        isActiveCalendar();

        history.replaceState({}, undefined, '/inbox-sent');

        chai.expect(isActiveInbox()).to.be.eql(true);
        chai.expect(inboxContainer.style.display).to.be.eql('');
        sinon.assert.notCalled(onUpdate);

        dispatchIlcPageReadyEvent();

        sinon.assert.calledOnce(onUpdate);
    });
});
