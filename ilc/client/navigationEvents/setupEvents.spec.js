import chai from 'chai';
import sinon from 'sinon';

import {
    addNavigationHook,
    removeNavigationHook,
    setNavigationErrorHandler,
    unsetNavigationErrorHandler,
} from './setupEvents';

describe('setupEvents', () => {
    let clock;
    const beforeRoutingEventHandler = sinon.spy();
    const popstateEventHandler = sinon.spy();

    before(() => {
        window.addEventListener('ilc:before-routing', beforeRoutingEventHandler);
        window.addEventListener('popstate', popstateEventHandler);
    });

    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();
        beforeRoutingEventHandler.resetHistory();
        popstateEventHandler.resetHistory();
    });

    after(() => {
        window.removeEventListener('ilc:before-routing', beforeRoutingEventHandler);
        window.removeEventListener('popstate', popstateEventHandler);
    });

    describe('while pushing history state or replacing state', () => {
        function shouldNotChangeLocationUrlByHistoryMethod(methodName) {
            it(`should not change location URL by "${methodName}" when navigation is canceled`, async () => {
                const hooks = [
                    sinon.stub().returns({
                        navigationShouldBeCanceled: true,
                    }),
                    sinon.stub().returns({
                        nextUrl: '/should/not/change/location/url',
                    }),
                    sinon.stub().returns(null),
                    sinon.stub().returns(undefined),
                ];

                try {
                    const prevHref = window.location.href;

                    for (const hook of hooks) {
                        addNavigationHook(hook);
                    }

                    window.history[methodName](null, undefined, '/some/url');
                    await clock.runAllAsync();

                    chai.expect(popstateEventHandler.called).to.be.false;
                    chai.expect(beforeRoutingEventHandler.called).to.be.false;
                    chai.expect(window.location.href).to.be.eql(prevHref);
                } finally {
                    for (const hook of hooks) {
                        removeNavigationHook(hook);
                    }
                }
            });
        }

        function shouldChangeLocationUrlByHistoryMethod(methodName) {
            it(`should change location URL by "${methodName}" when navigation is not canceled`, async () => {
                const nextUrl = '/should/change/location/url';
                const hooks = [
                    sinon.stub().returns({
                        nextUrl,
                    }),
                    sinon.stub().returns(null),
                    sinon.stub().returns(undefined),
                ];

                try {
                    for (const hook of hooks) {
                        addNavigationHook(hook);
                    }

                    window.history[methodName](null, undefined, '/some/url');
                    await clock.runAllAsync();

                    chai.expect(popstateEventHandler.called).to.be.true;
                    chai.expect(beforeRoutingEventHandler.called).to.be.true;
                    chai.expect(new URL(window.location.href).pathname).to.be.eql(nextUrl);
                } finally {
                    for (const hook of hooks) {
                        removeNavigationHook(hook);
                    }
                }
            });
        }

        function shouldNotChangeLocationUrlByHistoryMethodWhenSomeOfHooksThrowsAnError(methodName) {
            it(`should not change location URL by "${methodName}" when some of hooks throws an error and a custom error handler has set already`, async () => {
                const error = new Error('Hi there! I am an error. So it should be shown 500 error page.');
                const hooks = [
                    sinon.stub().returns({
                        nextUrl: '/should/not/change/location/url',
                    }),
                    sinon.stub().throws(error),
                    sinon.stub().returns(null),
                    sinon.stub().returns(undefined),
                ];
                const errorHandler = sinon.spy();
                const anotherErrorHandler = sinon.spy();

                try {
                    const prevHref = window.location.href;

                    for (const hook of hooks) {
                        addNavigationHook(hook);
                    }

                    setNavigationErrorHandler(errorHandler);
                    setNavigationErrorHandler(anotherErrorHandler);

                    window.history[methodName](null, undefined, '/some/url');
                    await clock.runAllAsync();

                    chai.expect(popstateEventHandler.called).to.be.false;
                    chai.expect(beforeRoutingEventHandler.called).to.be.false;
                    chai.expect(window.location.href).to.be.eql(prevHref);
                    chai.expect(errorHandler.calledOnceWithExactly(error, {
                        hookIndex: 1,
                    })).to.be.true;
                    chai.expect(anotherErrorHandler.called).to.be.false;
                } finally {
                    for (const hook of hooks) {
                        removeNavigationHook(hook);
                    }

                    unsetNavigationErrorHandler();
                }
            });

            it(`should not change location URL by "${methodName}" when some of hooks throws an error and a custom error handler has not been set yet`, async () => {
                const nextUrl = '/should/not/change/location/url';
                const error = new Error('Hi there! I am an error. So it should be shown 500 error page.');
                const hooks = [
                    sinon.stub().returns({
                        nextUrl,
                    }),
                    sinon.stub().throws(error),
                    sinon.stub().returns(null),
                    sinon.stub().returns(undefined),
                ];

                try {
                    const prevHref = window.location.href;

                    for (const hook of hooks) {
                        addNavigationHook(hook);
                    }

                    window.history[methodName](null, undefined, '/some/url');
                    await clock.runAllAsync();

                    chai.expect(popstateEventHandler.called).to.be.false;
                    chai.expect(beforeRoutingEventHandler.called).to.be.false;
                    chai.expect(window.location.href).to.be.eql(prevHref);
                } finally {
                    for (const hook of hooks) {
                        removeNavigationHook(hook);
                    }
                }
            });
        }

        function shouldProvideUrlAsStringToHooksWhenLocationWasProvidedAsUrlArgument(methodName) {
            it(`should provide an URL as a string to navigation hooks when "window.location" was provided as "url" argument to "${methodName}" method`, async () => {
                const hook = sinon.spy();

                try {
                    addNavigationHook(hook);

                    window.history[methodName](null, undefined, window.location);
                    await clock.runAllAsync();

                    chai.expect(hook.calledOnceWithExactly(window.location.pathname));
                } finally {
                    removeNavigationHook(hook);
                }
            });
        }

        shouldNotChangeLocationUrlByHistoryMethod('pushState');
        shouldNotChangeLocationUrlByHistoryMethod('replaceState');

        shouldChangeLocationUrlByHistoryMethod('pushState');
        shouldChangeLocationUrlByHistoryMethod('replaceState');

        shouldNotChangeLocationUrlByHistoryMethodWhenSomeOfHooksThrowsAnError('pushState');
        shouldNotChangeLocationUrlByHistoryMethodWhenSomeOfHooksThrowsAnError('replaceState');

        shouldProvideUrlAsStringToHooksWhenLocationWasProvidedAsUrlArgument('pushState');
        shouldProvideUrlAsStringToHooksWhenLocationWasProvidedAsUrlArgument('replaceState');
    });

    // TODO: Cover the case when history.back() or history.forward() can be dispatched with e2e tests because of async work of these methods
});
