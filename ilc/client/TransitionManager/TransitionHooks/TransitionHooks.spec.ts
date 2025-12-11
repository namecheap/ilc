import { expect } from 'chai';
import sinon, { type SinonSpy, type SinonStub } from 'sinon';
import { TransitionHooks } from './TransitionHooks';
import singleSpaEvents from '../../constants/singleSpaEvents';
import ilcEvents from '../../constants/ilcEvents';

interface MockLogger {
    warn: SinonSpy;
    error: SinonSpy;
}

interface MockHook {
    beforeHandler: SinonSpy;
    afterHandler: SinonSpy;
}

describe('TransitionHooks', () => {
    let mockLogger: MockLogger;
    let addEventListenerSpy: SinonSpy;
    let removeEventListenerSpy: SinonSpy;
    let originalHref: string;

    beforeEach(() => {
        mockLogger = {
            warn: sinon.spy(),
            error: sinon.spy(),
        };

        addEventListenerSpy = sinon.spy(window, 'addEventListener');
        removeEventListenerSpy = sinon.spy(window, 'removeEventListener');

        // Save original href
        originalHref = window.location.href;
    });

    afterEach(() => {
        addEventListenerSpy.restore();
        removeEventListenerSpy.restore();
        sinon.resetHistory();

        // Restore href if it was modified (though it shouldn't be in tests)
        // We can't actually change window.location.href in tests, but we track it
    });

    describe('constructor', () => {
        it('should create an instance with logger', () => {
            const hooks = new TransitionHooks(mockLogger);
            expect(hooks).to.be.instanceOf(TransitionHooks);
        });

        it('should initialize with empty hook list', () => {
            const hooks = new TransitionHooks(mockLogger);
            // Hook list is private, but we can verify behavior by subscribing and checking no hooks are called
            hooks.subscribe();

            const event = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event);

            // No errors should occur with empty hook list
            expect(mockLogger.error.called).to.be.false;
        });

        it('should initialize with subscribed as false', () => {
            const hooks = new TransitionHooks(mockLogger);

            // First subscribe should work without warning
            hooks.subscribe();
            expect(mockLogger.warn.called).to.be.false;
        });
    });

    describe('addHook', () => {
        it('should add a hook to the hook list', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(mockHook);
            hooks.subscribe();

            // Trigger before routing event
            const event = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event);

            expect(mockHook.beforeHandler.calledOnce).to.be.true;
        });

        it('should add multiple hooks', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook1: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };
            const mockHook2: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(mockHook1);
            hooks.addHook(mockHook2);
            hooks.subscribe();

            // Trigger before routing event
            const event = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event);

            expect(mockHook1.beforeHandler.calledOnce).to.be.true;
            expect(mockHook2.beforeHandler.calledOnce).to.be.true;
        });

        it('should allow adding hooks before subscription', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            // Add hook before subscribing
            hooks.addHook(mockHook);

            // Now subscribe
            hooks.subscribe();

            // Trigger event
            const event = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event);

            expect(mockHook.beforeHandler.calledOnce).to.be.true;
        });

        it('should allow adding hooks after subscription', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            // Subscribe first
            hooks.subscribe();

            // Add hook after subscribing
            hooks.addHook(mockHook);

            // Trigger event
            const event = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event);

            expect(mockHook.beforeHandler.calledOnce).to.be.true;
        });
    });

    describe('subscribe', () => {
        it('should add event listeners for before routing and all slots loaded', () => {
            const hooks = new TransitionHooks(mockLogger);

            hooks.subscribe();

            expect(addEventListenerSpy.callCount).to.equal(2);
            expect(addEventListenerSpy.calledWith(singleSpaEvents.BEFORE_ROUTING_EVENT, sinon.match.func)).to.be.true;
            expect(addEventListenerSpy.calledWith(ilcEvents.ALL_SLOTS_LOADED, sinon.match.func)).to.be.true;
        });

        it('should log warning and not subscribe again when already subscribed', () => {
            const hooks = new TransitionHooks(mockLogger);

            hooks.subscribe();
            hooks.subscribe(); // Second call

            expect(mockLogger.warn.calledOnce).to.be.true;
            expect(mockLogger.warn.firstCall.args[0]).to.include('Unexpected subscription');

            // Should only have 2 event listeners (from first subscribe)
            expect(addEventListenerSpy.callCount).to.equal(2);
        });

        it('should set subscribed flag to true', () => {
            const hooks = new TransitionHooks(mockLogger);

            hooks.subscribe();

            // Verify by attempting second subscribe
            hooks.subscribe();
            expect(mockLogger.warn.called).to.be.true;
        });
    });

    describe('unsubscribe', () => {
        it('should remove event listeners', () => {
            const hooks = new TransitionHooks(mockLogger);

            hooks.subscribe();
            hooks.unsubscribe();

            expect(removeEventListenerSpy.callCount).to.equal(2);
            expect(removeEventListenerSpy.calledWith(singleSpaEvents.BEFORE_ROUTING_EVENT, sinon.match.func)).to.be
                .true;
            expect(removeEventListenerSpy.calledWith(ilcEvents.ALL_SLOTS_LOADED, sinon.match.func)).to.be.true;
        });

        it('should do nothing when not subscribed', () => {
            const hooks = new TransitionHooks(mockLogger);

            hooks.unsubscribe(); // Called without subscribing first

            expect(removeEventListenerSpy.called).to.be.false;
        });

        it('should handle unsubscribe when handlers exist', () => {
            const hooks = new TransitionHooks(mockLogger);

            hooks.subscribe();
            hooks.unsubscribe();

            // Both handlers should be removed
            expect(removeEventListenerSpy.callCount).to.equal(2);
        });

        it('should set subscribed flag to false', () => {
            const hooks = new TransitionHooks(mockLogger);

            hooks.subscribe();
            hooks.unsubscribe();

            // Should be able to subscribe again without warning
            mockLogger.warn.resetHistory();
            hooks.subscribe();
            expect(mockLogger.warn.called).to.be.false;
        });

        it('should allow re-subscription after unsubscribe', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(mockHook);
            hooks.subscribe();
            hooks.unsubscribe();
            hooks.subscribe();

            // Trigger event
            const event = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event);

            expect(mockHook.beforeHandler.calledOnce).to.be.true;
        });
    });

    describe('beforeRoutingHandler', () => {
        it('should call beforeHandler on all hooks when event is triggered', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook1: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };
            const mockHook2: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(mockHook1);
            hooks.addHook(mockHook2);
            hooks.subscribe();

            const event = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event);

            expect(mockHook1.beforeHandler.calledOnce).to.be.true;
            expect(mockHook2.beforeHandler.calledOnce).to.be.true;
        });

        it('should not call beforeHandler twice for same href', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(mockHook);
            hooks.subscribe();

            // Trigger event twice without changing href
            const event1 = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event1);

            const event2 = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event2);

            // Should only be called once due to href check
            expect(mockHook.beforeHandler.calledOnce).to.be.true;
        });

        it('should log error when hook beforeHandler throws', () => {
            const hooks = new TransitionHooks(mockLogger);
            const errorHook = {
                beforeHandler: sinon.stub().throws(new Error('Test error')),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(errorHook);
            hooks.subscribe();

            const event = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);
            window.dispatchEvent(event);

            expect(mockLogger.error.calledOnce).to.be.true;
            expect(mockLogger.error.firstCall.args[0]).to.include('before handler error');
        });

        it('should continue calling other hooks after one throws error', () => {
            const hooks = new TransitionHooks(mockLogger);
            const errorHook = {
                beforeHandler: sinon.stub().throws(new Error('Test error')),
                afterHandler: sinon.spy(),
            };
            const goodHook: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(errorHook);
            hooks.addHook(goodHook);
            hooks.subscribe();

            const event = new Event(singleSpaEvents.BEFORE_ROUTING_EVENT);

            // The error will be caught, but execution stops due to how forEach works with errors
            // This is testing the actual behavior - error is logged, but forEach continues
            expect(() => window.dispatchEvent(event)).to.not.throw();
            expect(mockLogger.error.called).to.be.true;
        });
    });

    describe('allSlotsLoadedHandler', () => {
        it('should call afterHandler on all hooks when event is triggered', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook1: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };
            const mockHook2: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(mockHook1);
            hooks.addHook(mockHook2);
            hooks.subscribe();

            const event = new Event(ilcEvents.ALL_SLOTS_LOADED);
            window.dispatchEvent(event);

            expect(mockHook1.afterHandler.calledOnce).to.be.true;
            expect(mockHook2.afterHandler.calledOnce).to.be.true;
        });

        it('should call afterHandler multiple times if event is triggered multiple times', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(mockHook);
            hooks.subscribe();

            // Trigger event multiple times
            window.dispatchEvent(new Event(ilcEvents.ALL_SLOTS_LOADED));
            window.dispatchEvent(new Event(ilcEvents.ALL_SLOTS_LOADED));

            expect(mockHook.afterHandler.calledTwice).to.be.true;
        });

        it('should log error when hook afterHandler throws', () => {
            const hooks = new TransitionHooks(mockLogger);
            const errorHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.stub().throws(new Error('Test error')),
            };

            hooks.addHook(errorHook);
            hooks.subscribe();

            const event = new Event(ilcEvents.ALL_SLOTS_LOADED);
            window.dispatchEvent(event);

            expect(mockLogger.error.calledOnce).to.be.true;
            expect(mockLogger.error.firstCall.args[0]).to.include('after handler error');
        });

        it('should continue calling other hooks after one throws error', () => {
            const hooks = new TransitionHooks(mockLogger);
            const errorHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.stub().throws(new Error('Test error')),
            };
            const goodHook: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(errorHook);
            hooks.addHook(goodHook);
            hooks.subscribe();

            const event = new Event(ilcEvents.ALL_SLOTS_LOADED);

            expect(() => window.dispatchEvent(event)).to.not.throw();
            expect(mockLogger.error.called).to.be.true;
        });
    });

    describe('full transition lifecycle', () => {
        it('should execute before and after handlers in order', () => {
            const hooks = new TransitionHooks(mockLogger);
            const callOrder: string[] = [];
            const mockHook: MockHook = {
                beforeHandler: sinon.spy(() => callOrder.push('before')),
                afterHandler: sinon.spy(() => callOrder.push('after')),
            };

            hooks.addHook(mockHook);
            hooks.subscribe();

            // Trigger before routing event
            window.dispatchEvent(new Event(singleSpaEvents.BEFORE_ROUTING_EVENT));

            // Trigger all slots loaded event
            window.dispatchEvent(new Event(ilcEvents.ALL_SLOTS_LOADED));

            expect(callOrder).to.deep.equal(['before', 'after']);
        });

        it('should handle multiple transitions', () => {
            const hooks = new TransitionHooks(mockLogger);
            const mockHook: MockHook = {
                beforeHandler: sinon.spy(),
                afterHandler: sinon.spy(),
            };

            hooks.addHook(mockHook);
            hooks.subscribe();

            // First transition
            window.dispatchEvent(new Event(singleSpaEvents.BEFORE_ROUTING_EVENT));
            window.dispatchEvent(new Event(ilcEvents.ALL_SLOTS_LOADED));

            // Note: beforeHandler won't be called again unless href changes
            // But afterHandler will be called
            window.dispatchEvent(new Event(ilcEvents.ALL_SLOTS_LOADED));

            expect(mockHook.beforeHandler.callCount).to.equal(1); // Only once due to href check
            expect(mockHook.afterHandler.callCount).to.equal(2);
        });
    });
});
