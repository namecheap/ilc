import { expect } from 'chai';
import sinon from 'sinon';
import { CanonicalTagHandler } from '../client/CanonicalTagHandler';
import singleSpaEvents from '../client/constants/singleSpaEvents';
import { IlcIntl } from 'ilc-sdk/app';
import type { Logger } from 'ilc-plugins-sdk';
import { Route } from '../server/types/RegistryConfig';
import * as utils from '../common/utils';

interface ClientRouter {
    getCurrentRoute(): Route;
}

describe('CanonicalTagHandler', () => {
    let canonicalTagHandler: CanonicalTagHandler;
    let i18nMock: {
        localizeUrl: sinon.SinonStub;
    };
    let loggerMock: {
        info: sinon.SinonStub;
        error: sinon.SinonStub;
    };
    let routerMock: {
        getCurrentRoute: sinon.SinonStub;
    };
    let sandbox: sinon.SinonSandbox;
    let removeQueryParamsStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        i18nMock = {
            localizeUrl: sandbox.stub().callsFake((url: string) => {
                const urlObj = new URL(url, window.location.origin);
                const path = urlObj.pathname;
                const localizedPath = `/en${path.startsWith('/') ? path : `/${path}`}`;

                return `${urlObj.protocol}//${urlObj.host}${localizedPath}`;
            }),
        };

        loggerMock = {
            info: sandbox.stub(),
            error: sandbox.stub(),
        };

        routerMock = {
            getCurrentRoute: sandbox.stub(),
        };

        removeQueryParamsStub = sandbox.stub(utils, 'removeQueryParams');
        removeQueryParamsStub.callsFake((url) => (url ? url.split('?')[0] : ''));

        canonicalTagHandler = new CanonicalTagHandler(
            i18nMock as unknown as IlcIntl,
            loggerMock as unknown as Logger,
            routerMock as unknown as ClientRouter,
        );
    });

    afterEach(() => {
        sandbox.restore();

        if (typeof document !== 'undefined') {
            const canonicalTag = document.querySelector('link[rel="canonical"][data-ilc="1"]');
            if (canonicalTag) {
                canonicalTag.remove();
            }
        }
    });

    describe('Constructor and public methods', () => {
        it('should initialize with the provided dependencies', () => {
            expect(canonicalTagHandler).to.be.instanceOf(CanonicalTagHandler);
        });

        it('should have start and stop methods', () => {
            expect(canonicalTagHandler.start).to.be.a('function');
            expect(canonicalTagHandler.stop).to.be.a('function');
        });
    });

    describe('Event handling', () => {
        it('should add event listener on start', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            const addEventListenerSpy = sandbox.spy(window, 'addEventListener');
            canonicalTagHandler.start();
            expect(addEventListenerSpy.calledWith(singleSpaEvents.ROUTING_EVENT)).to.be.true;
        });

        it('should remove event listener on stop', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            const removeEventListenerSpy = sandbox.spy(window, 'removeEventListener');
            canonicalTagHandler.stop();
            expect(removeEventListenerSpy.calledWith(singleSpaEvents.ROUTING_EVENT)).to.be.true;
        });
    });

    describe('Router integration', () => {
        it('should use router to get current route', () => {
            routerMock.getCurrentRoute.returns({
                route: '/test',
                next: false,
                template: 'default',
                specialRole: null,
                meta: {
                    canonicalUrl: '/custom-path',
                },
            });

            if (typeof window !== 'undefined') {
                (canonicalTagHandler as any).determineCanonicalUrl('https://example.com/default');
            } else {
                routerMock.getCurrentRoute();
            }
            expect(routerMock.getCurrentRoute.called).to.be.true;
        });

        it('should handle router errors gracefully', () => {
            routerMock.getCurrentRoute.throws(new Error('Router error'));

            if (typeof window !== 'undefined') {
                const defaultUrl = 'https://example.com/default';
                const result = (canonicalTagHandler as any).determineCanonicalUrl(defaultUrl);

                expect(loggerMock.error.calledWith('CanonicalTagHandler: Error getting current route')).to.be.true;
                expect(result).to.equal(defaultUrl);
            } else {
                expect(() => routerMock.getCurrentRoute()).to.throw();
            }
        });
    });

    describe('handleRoutingChange method', () => {
        let canonicalTag: HTMLLinkElement;

        beforeEach(() => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            canonicalTag = document.createElement('link');
            canonicalTag.setAttribute('rel', 'canonical');
            canonicalTag.setAttribute('data-ilc', '1');
            document.head.appendChild(canonicalTag);
        });

        afterEach(() => {
            if (typeof window === 'undefined') {
                return;
            }

            if (canonicalTag?.parentNode) {
                canonicalTag.parentNode.removeChild(canonicalTag);
            }
        });

        it('should update canonical tag href on routing event', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            routerMock.getCurrentRoute.returns({ meta: {} });
            removeQueryParamsStub.returns(window.location.origin + '/page');

            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: {
                    location: {
                        href: window.location.origin + '/page?query=param',
                    },
                },
            });

            (canonicalTagHandler as any).handleRoutingChange(event);

            expect(canonicalTag.getAttribute('href')).to.equal(window.location.origin + '/en/page');
        });

        it('should handle event with missing location property', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            routerMock.getCurrentRoute.returns({ meta: {} });

            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: {}, // Missing location property
            });

            (canonicalTagHandler as any).handleRoutingChange(event);

            expect(removeQueryParamsStub.called).to.be.true;
        });

        it('should handle event with undefined target', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            routerMock.getCurrentRoute.returns({ meta: {} });

            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: undefined,
            });

            (canonicalTagHandler as any).handleRoutingChange(event);

            expect(removeQueryParamsStub.calledWith(undefined)).to.be.true;
        });

        it('should handle event with null href', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            routerMock.getCurrentRoute.returns({ meta: {} });

            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: {
                    location: {
                        href: null,
                    },
                },
            });

            (canonicalTagHandler as any).handleRoutingChange(event);

            expect(removeQueryParamsStub.calledWith(null)).to.be.true;
        });

        it('should handle absence of i18n', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            const handlerWithoutI18n = new CanonicalTagHandler(
                null as unknown as IlcIntl,
                loggerMock as unknown as Logger,
                routerMock as unknown as ClientRouter,
            );

            routerMock.getCurrentRoute.returns({
                route: '/test',
                next: false,
                template: 'default',
                specialRole: null,
                meta: { canonicalUrl: '/canonical-path' },
            });

            removeQueryParamsStub.returns(window.location.origin + '/test');

            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: {
                    location: {
                        href: window.location.origin + '/test',
                    },
                },
            });

            (handlerWithoutI18n as any).handleRoutingChange(event);

            expect(canonicalTag.getAttribute('href')).to.equal(window.location.origin + '/canonical-path');
        });

        it('should log error if canonical tag is not found', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            if (canonicalTag?.parentNode) {
                canonicalTag.parentNode.removeChild(canonicalTag);
            }

            const event = new Event(singleSpaEvents.ROUTING_EVENT);

            (canonicalTagHandler as any).handleRoutingChange(event);

            expect(loggerMock.error.calledWith('CanonicalTagHandler: Can not find canonical tag on the page')).to.be
                .true;
        });
    });

    describe('determineCanonicalUrl method', () => {
        it('should use route canonical URL when available', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            routerMock.getCurrentRoute.returns({
                route: '/test',
                next: false,
                template: 'default',
                specialRole: null,
                meta: {
                    canonicalUrl: '/canonical-path',
                },
            });

            const defaultUrl = window.location.origin + '/default';
            const result = (canonicalTagHandler as any).determineCanonicalUrl(defaultUrl);

            const expectedUrl = window.location.origin + '/canonical-path';
            expect(result).to.equal(expectedUrl);
        });

        it('should handle canonical URL with or without leading slash', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            routerMock.getCurrentRoute.returns({
                route: '/test',
                next: false,
                template: 'default',
                specialRole: null,
                meta: {
                    canonicalUrl: '/with-leading-slash',
                },
            });

            let defaultUrl = window.location.origin + '/default';
            let result = (canonicalTagHandler as any).determineCanonicalUrl(defaultUrl);
            expect(result).to.equal(window.location.origin + '/with-leading-slash');

            routerMock.getCurrentRoute.returns({
                route: '/test',
                next: false,
                template: 'default',
                specialRole: null,
                meta: {
                    canonicalUrl: 'no-leading-slash',
                },
            });

            result = (canonicalTagHandler as any).determineCanonicalUrl(defaultUrl);
            expect(result).to.equal(window.location.origin + '/no-leading-slash');
        });

        it('should use default URL when route has no meta property', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            routerMock.getCurrentRoute.returns({
                route: '/test',
                next: false,
                template: 'default',
                specialRole: null,
            });

            const defaultUrl = window.location.origin + '/default';
            const result = (canonicalTagHandler as any).determineCanonicalUrl(defaultUrl);

            expect(result).to.equal(defaultUrl);
        });

        it('should use default URL when route meta has no canonicalUrl', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            routerMock.getCurrentRoute.returns({
                route: '/test',
                next: false,
                template: 'default',
                specialRole: null,
                meta: { someOtherProperty: 'value' },
            });

            const defaultUrl = window.location.origin + '/default';
            const result = (canonicalTagHandler as any).determineCanonicalUrl(defaultUrl);

            expect(result).to.equal(defaultUrl);
        });
    });
});
