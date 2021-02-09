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
                    sinon.stub().returns(null),
                    sinon.stub().returns('/should/not/change/location/url'),
                ];
                const prevHref = window.location.href;

                try {
                    for (const hook of hooks) {
                        addNavigationHook(hook);
                    }

                    window.history[methodName](null, undefined, '/some/url');
                    await clock.runAllAsync();
                } finally {
                    for (const hook of hooks) {
                        removeNavigationHook(hook);
                    }
                }

                chai.expect(popstateEventHandler.called).to.be.false;
                chai.expect(beforeRoutingEventHandler.called).to.be.false;
                chai.expect(window.location.href).to.be.eql(prevHref);
            });
        }

        function shouldChangeLocationUrlByHistoryMethod(methodName) {
            it(`should change location URL by "${methodName}" when navigation is not canceled`, async () => {
                const nextUrl = window.location.origin + '/should/change/location/url';
                const hooks = [
                    sinon.stub().returns('/should/not/be/this/url'),
                    sinon.stub().returns('/should/not/be/this/url/either'),
                    sinon.stub().returns(nextUrl),
                ];

                try {
                    for (const hook of hooks) {
                        addNavigationHook(hook);
                    }

                    window.history[methodName](null, undefined, '/some/url');
                    await clock.runAllAsync();
                } finally {
                    for (const hook of hooks) {
                        removeNavigationHook(hook);
                    }
                }

                chai.expect(popstateEventHandler.called).to.be.true;
                chai.expect(beforeRoutingEventHandler.called).to.be.true;
                chai.expect(window.location.href).to.be.eql(nextUrl);
            });
        }

        function shouldNotChangeLocationUrlByHistoryMethodWhenSomeOfHooksThrowsAnError(methodName) {
            it(`should not change location URL by "${methodName}" when some of hooks throws an error and a custom error handler has set already`, async () => {
                const error = new Error('Hi there! I am an error. So it should be shown 500 error page.');
                const hooks = [
                    sinon.stub().returns('/should/not/change/location/url'),
                    sinon.stub().throws(error),
                ];
                const errorHandler = sinon.spy();
                const anotherErrorHandler = sinon.spy();
                const prevHref = window.location.href;

                try {
                    for (const hook of hooks) {
                        addNavigationHook(hook);
                    }

                    setNavigationErrorHandler(errorHandler);
                    setNavigationErrorHandler(anotherErrorHandler);

                    window.history[methodName](null, undefined, '/some/url');
                    await clock.runAllAsync();
                } finally {
                    for (const hook of hooks) {
                        removeNavigationHook(hook);
                    }

                    unsetNavigationErrorHandler();
                }

                chai.expect(popstateEventHandler.called).to.be.false;
                chai.expect(beforeRoutingEventHandler.called).to.be.false;
                chai.expect(window.location.href).to.be.eql(prevHref);
                chai.expect(errorHandler.calledOnceWithExactly(error, {
                    hookIndex: 1,
                })).to.be.true;
                chai.expect(anotherErrorHandler.called).to.be.false;
            });

            it(`should not change location URL by "${methodName}" when some of hooks throws an error and a custom error handler has not been set yet`, async () => {
                const nextUrl = '/should/not/change/location/url';
                const error = new Error('Hi there! I am an error. So it should be shown 500 error page.');
                const hooks = [
                    sinon.stub().returns(nextUrl),
                    sinon.stub().throws(error),
                ];
                const prevHref = window.location.href;

                try {
                    for (const hook of hooks) {
                        addNavigationHook(hook);
                    }

                    window.history[methodName](null, undefined, '/some/url');
                    await clock.runAllAsync();
                } finally {
                    for (const hook of hooks) {
                        removeNavigationHook(hook);
                    }
                }

                chai.expect(popstateEventHandler.called).to.be.false;
                chai.expect(beforeRoutingEventHandler.called).to.be.false;
                chai.expect(window.location.href).to.be.eql(prevHref);
            });
        }

        function shouldProvideUrlAsStringToHooksWhenLocationWasProvidedAsUrlArgument(methodName) {
            it(`should provide an URL as a string to navigation hooks when an object was provided as "url" argument to "${methodName}" method`, async () => {
                const hook = sinon.spy();
                const relativeUrl = '/some/url?search=true#hash';
                const url = new URL(relativeUrl, window.location.origin);

                try {
                    addNavigationHook(hook);
                    window.history[methodName](null, undefined, url);
                    await clock.runAllAsync();
                } finally {
                    removeNavigationHook(hook);
                }

                chai.expect(hook.calledOnceWithExactly(relativeUrl)).to.be.true;
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
