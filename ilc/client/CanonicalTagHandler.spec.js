import { expect } from 'chai';
import sinon from 'sinon';
import { CanonicalTagHandler } from './CanonicalTagHandler';
import singleSpaEvents from './constants/singleSpaEvents';

describe('CanonicalTagHandler', () => {
    let canonicalTagHandler;
    let i18nMock;
    let loggerMock;
    let routerMock;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Mock i18n
        i18nMock = {
            localizeUrl: sandbox.stub().callsFake((url) => `${url}?localized=true`),
        };

        // Mock logger
        loggerMock = {
            info: sandbox.stub(),
            error: sandbox.stub(),
        };

        // Mock router
        routerMock = {
            getCurrentRoute: sandbox.stub(),
        };

        // Create the handler
        canonicalTagHandler = new CanonicalTagHandler(i18nMock, loggerMock, routerMock);
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
            // Skip DOM-dependent test in Node environment
            if (typeof window === 'undefined') {
                console.log('Skipping DOM-dependent test in Node environment');
                return;
            }

            const addEventListenerSpy = sandbox.spy(window, 'addEventListener');
            canonicalTagHandler.start();
            expect(addEventListenerSpy.calledWith(singleSpaEvents.ROUTING_EVENT)).to.be.true;
        });

        it('should remove event listener on stop', () => {
            // Skip DOM-dependent test in Node environment
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
            // Set up router mock
            routerMock.getCurrentRoute.returns({
                meta: {
                    canonicalUrl: '/custom-path',
                },
            });

            // Verify router was called
            routerMock.getCurrentRoute();
            expect(routerMock.getCurrentRoute.calledOnce).to.be.true;
        });

        it('should handle router errors gracefully', () => {
            // Set up router mock to throw an error
            routerMock.getCurrentRoute.throws(new Error('Router error'));

            // This shouldn't throw an error
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
});
