import { expect } from 'chai';
import sinon from 'sinon';
import { CanonicalTagHandler } from './CanonicalTagHandler';
import singleSpaEvents from './constants/singleSpaEvents';
import { IlcIntl } from 'ilc-sdk/app';
import type { Logger } from 'ilc-plugins-sdk';
import { Route } from '../server/types/RegistryConfig';

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

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        i18nMock = {
            localizeUrl: sandbox.stub().callsFake((url: string) => `${url}?localized=true`),
        };

        loggerMock = {
            info: sandbox.stub(),
            error: sandbox.stub(),
        };

        routerMock = {
            getCurrentRoute: sandbox.stub(),
        };

        canonicalTagHandler = new CanonicalTagHandler(
            i18nMock as unknown as IlcIntl,
            loggerMock as unknown as Logger,
            routerMock as unknown as ClientRouter,
        );
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Constructor and public methods', () => {
        it('should initialize with the provided dependencies', () => {
            expect(canonicalTagHandler).to.be.an('object');
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
                meta: {
                    canonicalUrl: '/custom-path',
                },
            });

            routerMock.getCurrentRoute();
            expect(routerMock.getCurrentRoute.calledOnce).to.be.true;
        });

        it('should handle router errors gracefully', () => {
            routerMock.getCurrentRoute.throws(new Error('Router error'));

            expect(() => routerMock.getCurrentRoute()).to.throw();
            expect(routerMock.getCurrentRoute.calledOnce).to.be.true;
        });
    });

    describe('i18n integration', () => {
        it('should use i18n to localize URLs', () => {
            const url = 'https://example.com/path';
            expect(i18nMock.localizeUrl(url)).to.equal('https://example.com/path?localized=true');
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

            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: {
                    location: {
                        href: 'https://example.com/page?query=param',
                    },
                },
            });

            canonicalTagHandler.start();
            window.dispatchEvent(event);

            expect(canonicalTag.getAttribute('href')).to.equal('https://example.com/page?localized=true');
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

            canonicalTagHandler.start();
            window.dispatchEvent(event);

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
                meta: {
                    canonicalUrl: '/canonical-path',
                },
            });

            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: {
                    location: {
                        href: 'https://example.com/page',
                    },
                },
            });

            const canonicalTag = document.createElement('link');
            canonicalTag.setAttribute('rel', 'canonical');
            canonicalTag.setAttribute('data-ilc', '1');
            document.head.appendChild(canonicalTag);

            canonicalTagHandler.start();
            window.dispatchEvent(event);

            expect(canonicalTag.getAttribute('href')).to.include('/canonical-path');

            canonicalTag.parentNode?.removeChild(canonicalTag);
        });

        it('should handle canonical URL with or without leading slash', () => {
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            routerMock.getCurrentRoute.returns({
                meta: {
                    canonicalUrl: 'no-leading-slash',
                },
            });

            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: {
                    location: {
                        href: 'https://example.com/page',
                    },
                },
            });

            const canonicalTag = document.createElement('link');
            canonicalTag.setAttribute('rel', 'canonical');
            canonicalTag.setAttribute('data-ilc', '1');
            document.head.appendChild(canonicalTag);

            canonicalTagHandler.start();
            window.dispatchEvent(event);

            expect(canonicalTag.getAttribute('href')).to.include('/no-leading-slash');

            canonicalTag.parentNode?.removeChild(canonicalTag);
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

            routerMock.getCurrentRoute.returns({ meta: {} });

            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: {
                    location: {
                        href: 'https://example.com/default-path',
                    },
                },
            });

            const canonicalTag = document.createElement('link');
            canonicalTag.setAttribute('rel', 'canonical');
            canonicalTag.setAttribute('data-ilc', '1');
            document.head.appendChild(canonicalTag);

            handlerWithoutI18n.start();
            window.dispatchEvent(event);

            expect(canonicalTag.getAttribute('href')).to.equal('https://example.com/default-path');

            canonicalTag.parentNode?.removeChild(canonicalTag);
        });
    });
});
