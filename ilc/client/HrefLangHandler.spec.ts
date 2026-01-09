import { expect } from 'chai';
import sinon, { type SinonStub, type SinonSpy } from 'sinon';
import { IlcIntl } from 'ilc-sdk/app';
import { HrefLangHandler } from './HrefLangHandler';
import singleSpaEvents from './constants/singleSpaEvents';
import * as utils from '../common/utils';

interface MockLogger {
    error: SinonSpy;
}

interface I18nConfig {
    enabled: boolean;
    default: {
        locale: string;
        currency: string;
    };
    supported: {
        locale: string[];
        currency: string[];
    };
    routingStrategy: string;
}

describe('HrefLangHandler', () => {
    let handler: InstanceType<typeof HrefLangHandler> | null;
    let mockLogger: MockLogger;
    let i18nConfig: I18nConfig;
    let removeQueryParamsStub: SinonStub;
    let localizeUrlStub: SinonStub;

    beforeEach(() => {
        mockLogger = {
            error: sinon.spy(),
        };

        i18nConfig = {
            enabled: true,
            default: {
                locale: 'en-US',
                currency: 'USD',
            },
            supported: {
                locale: ['en-US', 'es-ES', 'fr-FR'],
                currency: ['USD', 'EUR'],
            },
            routingStrategy: 'prefix_except_default',
        };

        removeQueryParamsStub = sinon.stub(utils, 'removeQueryParams');
        localizeUrlStub = sinon.stub(IlcIntl, 'localizeUrl');
    });

    afterEach(() => {
        if (handler) {
            handler.stop();
        }
        removeQueryParamsStub.restore();
        localizeUrlStub.restore();
        mockLogger.error.resetHistory();

        // Clean up any hreflang links
        document.querySelectorAll('link[rel="alternate"][data-ilc="1"]').forEach((link) => link.remove());
    });

    describe('constructor', () => {
        it('should initialize with i18n config', () => {
            handler = new HrefLangHandler(i18nConfig, mockLogger);
            expect(handler).to.exist;
        });

        it('should handle missing i18n config', () => {
            handler = new HrefLangHandler(null, mockLogger);
            expect(handler).to.exist;
        });

        it('should handle i18n config without supported locales', () => {
            const configWithoutLocales = {
                enabled: true,
                default: { locale: 'en-US' },
            };
            handler = new HrefLangHandler(configWithoutLocales, mockLogger);
            expect(handler).to.exist;
        });
    });

    describe('start', () => {
        it('should add routing event listener', () => {
            handler = new HrefLangHandler(i18nConfig, mockLogger);
            const addEventListenerSpy = sinon.spy(window, 'addEventListener');

            handler.start();

            expect(addEventListenerSpy.calledWith(singleSpaEvents.ROUTING_EVENT)).to.be.true;

            addEventListenerSpy.restore();
        });
    });

    describe('stop', () => {
        it('should remove routing event listener', () => {
            handler = new HrefLangHandler(i18nConfig, mockLogger);
            const removeEventListenerSpy = sinon.spy(window, 'removeEventListener');

            handler.start();
            handler.stop();

            expect(removeEventListenerSpy.calledWith(singleSpaEvents.ROUTING_EVENT)).to.be.true;

            removeEventListenerSpy.restore();
        });
    });

    describe('routing change handling', () => {
        beforeEach(() => {
            handler = new HrefLangHandler(i18nConfig, mockLogger);
            handler.start();
        });

        it('should update hreflang links on routing event', () => {
            const currentUrl = 'http://localhost:3000/test-page';
            const cleanUrl = 'http://localhost:3000/test-page';

            removeQueryParamsStub.returns(cleanUrl);
            localizeUrlStub.callsFake((_config, _url, options) => {
                if (options.locale === 'es-ES') {
                    return 'http://localhost:3000/es/test-page';
                }
                return 'http://localhost:3000/test-page';
            });

            // Create hreflang links
            const esLink = document.createElement('link');
            esLink.setAttribute('rel', 'alternate');
            esLink.setAttribute('hreflang', 'es-ES');
            esLink.setAttribute('data-ilc', '1');
            esLink.setAttribute('href', 'http://localhost:3000/es/old-page');
            document.head.appendChild(esLink);

            // Dispatch routing event
            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: { location: { href: currentUrl } },
                writable: false,
            });
            window.dispatchEvent(event);

            expect(removeQueryParamsStub.calledWith(currentUrl)).to.be.true;
            expect(localizeUrlStub.called).to.be.true;
            expect(esLink.getAttribute('href')).to.equal('http://localhost:3000/es/test-page');
        });

        it('should handle x-default hreflang with default locale', () => {
            const currentUrl = 'http://localhost:3000/test-page';
            const cleanUrl = 'http://localhost:3000/test-page';

            removeQueryParamsStub.returns(cleanUrl);
            localizeUrlStub.callsFake((_config, url, options) => {
                if (options.locale === 'en-US') {
                    return 'http://localhost:3000/test-page';
                }
                return url;
            });

            // Create x-default hreflang link
            const defaultLink = document.createElement('link');
            defaultLink.setAttribute('rel', 'alternate');
            defaultLink.setAttribute('hreflang', 'x-default');
            defaultLink.setAttribute('data-ilc', '1');
            defaultLink.setAttribute('href', 'http://localhost:3000/old-page');
            document.head.appendChild(defaultLink);

            // Dispatch routing event
            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: { location: { href: currentUrl } },
                writable: false,
            });
            window.dispatchEvent(event);

            expect(localizeUrlStub.calledWith(i18nConfig, cleanUrl, { locale: 'en-US' })).to.be.true;
            expect(defaultLink.getAttribute('href')).to.equal('http://localhost:3000/test-page');
        });

        it('should update multiple hreflang links', () => {
            const currentUrl = 'http://localhost:3000/test-page';
            const cleanUrl = 'http://localhost:3000/test-page';

            removeQueryParamsStub.returns(cleanUrl);
            localizeUrlStub.callsFake((_config, _url, options) => {
                if (options.locale === 'es-ES') {
                    return 'http://localhost:3000/es/test-page';
                }
                if (options.locale === 'fr-FR') {
                    return 'http://localhost:3000/fr/test-page';
                }
                return 'http://localhost:3000/test-page';
            });

            // Create multiple hreflang links
            const esLink = document.createElement('link');
            esLink.setAttribute('rel', 'alternate');
            esLink.setAttribute('hreflang', 'es-ES');
            esLink.setAttribute('data-ilc', '1');
            esLink.setAttribute('href', 'http://localhost:3000/es/old-page');
            document.head.appendChild(esLink);

            const frLink = document.createElement('link');
            frLink.setAttribute('rel', 'alternate');
            frLink.setAttribute('hreflang', 'fr-FR');
            frLink.setAttribute('data-ilc', '1');
            frLink.setAttribute('href', 'http://localhost:3000/fr/old-page');
            document.head.appendChild(frLink);

            // Dispatch routing event
            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: { location: { href: currentUrl } },
                writable: false,
            });
            window.dispatchEvent(event);

            expect(esLink.getAttribute('href')).to.equal('http://localhost:3000/es/test-page');
            expect(frLink.getAttribute('href')).to.equal('http://localhost:3000/fr/test-page');
        });

        it('should ignore links without data-ilc attribute', () => {
            const currentUrl = 'http://localhost:3000/test-page';
            const cleanUrl = 'http://localhost:3000/test-page';

            removeQueryParamsStub.returns(cleanUrl);
            localizeUrlStub.returns('http://localhost:3000/es/test-page');

            // Create hreflang link without data-ilc attribute
            const linkWithoutDataIlc = document.createElement('link');
            linkWithoutDataIlc.setAttribute('rel', 'alternate');
            linkWithoutDataIlc.setAttribute('hreflang', 'es-ES');
            linkWithoutDataIlc.setAttribute('href', 'http://localhost:3000/es/old-page');
            document.head.appendChild(linkWithoutDataIlc);

            const initialHref = linkWithoutDataIlc.getAttribute('href');

            // Dispatch routing event
            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: { location: { href: currentUrl } },
                writable: false,
            });
            window.dispatchEvent(event);

            // Link should not be updated
            expect(linkWithoutDataIlc.getAttribute('href')).to.equal(initialHref);
            expect(localizeUrlStub.called).to.be.false;

            linkWithoutDataIlc.remove();
        });

        it('should handle errors during link update', () => {
            const currentUrl = 'http://localhost:3000/test-page';
            const cleanUrl = 'http://localhost:3000/test-page';
            const testError = new Error('Localization failed');

            removeQueryParamsStub.returns(cleanUrl);
            localizeUrlStub.throws(testError);

            // Create hreflang link
            const esLink = document.createElement('link');
            esLink.setAttribute('rel', 'alternate');
            esLink.setAttribute('hreflang', 'es-ES');
            esLink.setAttribute('data-ilc', '1');
            esLink.setAttribute('href', 'http://localhost:3000/es/old-page');
            document.head.appendChild(esLink);

            // Dispatch routing event
            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: { location: { href: currentUrl } },
                writable: false,
            });
            window.dispatchEvent(event);

            // Error should be logged
            expect(mockLogger.error.calledOnce).to.be.true;
            expect(mockLogger.error.firstCall.args[0]).to.equal('HrefLangHandler: Error while updating hreflang links');
            expect(mockLogger.error.firstCall.args[1]).to.equal(testError);
        });

        it('should continue updating other links when one fails', () => {
            const currentUrl = 'http://localhost:3000/test-page';
            const cleanUrl = 'http://localhost:3000/test-page';
            const testError = new Error('Localization failed');

            removeQueryParamsStub.returns(cleanUrl);
            localizeUrlStub.callsFake((_config, url, options) => {
                if (options.locale === 'es-ES') {
                    throw testError;
                }
                if (options.locale === 'fr-FR') {
                    return 'http://localhost:3000/fr/test-page';
                }
                return url;
            });

            // Create multiple hreflang links
            const esLink = document.createElement('link');
            esLink.setAttribute('rel', 'alternate');
            esLink.setAttribute('hreflang', 'es-ES');
            esLink.setAttribute('data-ilc', '1');
            esLink.setAttribute('href', 'http://localhost:3000/es/old-page');
            document.head.appendChild(esLink);

            const frLink = document.createElement('link');
            frLink.setAttribute('rel', 'alternate');
            frLink.setAttribute('hreflang', 'fr-FR');
            frLink.setAttribute('data-ilc', '1');
            frLink.setAttribute('href', 'http://localhost:3000/fr/old-page');
            document.head.appendChild(frLink);

            // Dispatch routing event
            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: { location: { href: currentUrl } },
                writable: false,
            });
            window.dispatchEvent(event);

            // First link should fail, second should succeed
            expect(mockLogger.error.calledOnce).to.be.true;
            expect(esLink.getAttribute('href')).to.equal('http://localhost:3000/es/old-page'); // unchanged
            expect(frLink.getAttribute('href')).to.equal('http://localhost:3000/fr/test-page'); // updated
        });

        it('should remove query parameters from URL before processing', () => {
            const currentUrl = 'http://localhost:3000/test-page?param=value#hash';
            const cleanUrl = 'http://localhost:3000/test-page';

            removeQueryParamsStub.returns(cleanUrl);
            localizeUrlStub.returns('http://localhost:3000/es/test-page');

            // Create hreflang link
            const esLink = document.createElement('link');
            esLink.setAttribute('rel', 'alternate');
            esLink.setAttribute('hreflang', 'es-ES');
            esLink.setAttribute('data-ilc', '1');
            esLink.setAttribute('href', 'http://localhost:3000/es/old-page');
            document.head.appendChild(esLink);

            // Dispatch routing event
            const event = new Event(singleSpaEvents.ROUTING_EVENT);
            Object.defineProperty(event, 'target', {
                value: { location: { href: currentUrl } },
                writable: false,
            });
            window.dispatchEvent(event);

            expect(removeQueryParamsStub.calledOnceWith(currentUrl)).to.be.true;
            expect(localizeUrlStub.calledWith(i18nConfig, cleanUrl)).to.be.true;
        });
    });
});
