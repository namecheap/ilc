import chai from 'chai';
import sinon from 'sinon';
import html from 'nanohtml';

import ClientRouter from './ClientRouter';

describe('client router', () => {
    const singleSpa = {
        navigateToUrl: () => {},
        triggerAppChange: () => {},
        getMountedApps: () => [],
    };
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
        '404': {
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

    let router;

    afterEach(() => {
        document.body.innerHTML = '';
        router.removeEventListeners();
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

            router = new ClientRouter(registryConfig, {}, undefined, singleSpa, location);

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
                    <div>Hi there! I have a base tag, so client router should initialize based on href of the base tag.</div>
                    <base href="${reqUrl}">
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

            router = new ClientRouter(registryConfig, {}, undefined, singleSpa, location, logger);

            chai.expect(mainRef.getElementsByTagName('base')).to.be.empty;

            chai.expect(router.getCurrentRoute()).to.be.eql(expectedRoute);
            chai.expect(router.getPrevRoute()).to.be.eql(expectedRoute);

            chai.expect(router.getCurrentRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);
            chai.expect(router.getPrevRouteProps('@portal/hero', 'hero')).to.be.eql(expectedRouteProps);

            chai.expect(logger.warn.calledOnceWithExactly(
                'ILC: <base> tag was used only for initial rendering and removed afterwards.\n' +
                'Currently, ILC does not support it fully.\n' +
                'Please open an issue if you need this functionality.'
            )).to.be.true;
        });
    });

    describe('should listen to ilc:before-routing event when client routes was initialized', () => {
        let singleSpaBeforeRoutingEvent;

        const singleSpaBeforeRoutingEventName = 'ilc:before-routing';

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

            router = new ClientRouter(registryConfig, {}, undefined, singleSpa, location);

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

            router = new ClientRouter(registryConfig, {}, undefined, singleSpa, location);

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

                router = new ClientRouter(registryConfig, {}, undefined, singleSpa, location);

                const [eventName, eventListener] = addEventListener.getCall(0).args;

                location.pathname = registryConfig.routes[3].route;
                location.search = '?throw=error';

                chai.expect(eventName).to.be.eql(singleSpaBeforeRoutingEventName);
                chai.expect(eventListener).to.throw(
                    'Base template was changed.\n' +
                    'Currently, ILC does not handle it.\n' +
                    'Please open an issue if you need this functionality.'
                );
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
            router = new ClientRouter(registryConfig, {}, undefined, singleSpa);
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
                    Hi there! I am anchor tag and I have href attribute.
                    So I should forward you to registered micro front-end page.
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
                    Hi there! I am anchor tag and I have href attribute.
                    So I should forward you to registered micro front-end page.
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
                    Hi there! I am anchor tag and I do not have href attribute.
                    So I should not forward you to a registered micro front-end page.
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
                        Hi there! I am span tag and I have the closest anchor tag that has href attribute.
                        But event click is going to be prevented previously.
                        So I should not forward you to registered micro front-end page.
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
                        Hi there! I am span tag and I have the closest anchor tag that has href attribute.
                        But event click is going to be prevented previously.
                        So I should not forward you to registered micro front-end page.
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

                anchor.ref = html`
                    <a id="${anchor.id}" href="${anchor.href}">
                        Hi there! I am an anchor tag.
                    </a>
                `;

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
            router = new ClientRouter(registryConfig, {}, undefined, singleSpa);
        });

        it('should throw an error when an app is not defined', () => {
            chai.expect(router.getCurrentRouteProps.bind(router, '@portal/undefined', 'hero')).to.throw('Can not find info about the app.');
            chai.expect(router.getPrevRouteProps.bind(router, '@portal/undefined', 'hero')).to.throw('Can not find info about the app.');
        });

        it('should throw an error when a slot is not defined', () => {
            chai.expect(router.getCurrentRouteProps.bind(router, '@portal/hero', 'undefined')).to.throw('Can not find info about the slot');
            chai.expect(router.getPrevRouteProps.bind(router, '@portal/hero', 'undefined')).to.throw('Can not find info about the slot');
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

            router = new ClientRouter(registryConfig, {}, i18n, singleSpa);
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

            chai.expect(i18n.unlocalizeUrl.calledWithExactly(localizedUrl))
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
});
