import chai from 'chai';
import sinon from 'sinon';

import {addNavigationHook, removeNavigationHook} from './setupEvents';

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
                const nextUrl = '/should/not/change/location/url';
                const hooks = [
                    sinon.stub().returns({
                        navigationShouldBeCanceled: true,
                    }),
                    sinon.stub().returns({
                        nextUrl,
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

        shouldNotChangeLocationUrlByHistoryMethod('pushState');
        shouldNotChangeLocationUrlByHistoryMethod('replaceState');

        shouldChangeLocationUrlByHistoryMethod('pushState');
        shouldChangeLocationUrlByHistoryMethod('replaceState');
    });

    describe('while dispatching history back or forward', () => {
        const replaceState = sinon.spy(window.history, 'replaceState');

        afterEach(() => {
            replaceState.resetHistory();
        });

        after(() => {
            replaceState.restore();
        });

        it('should not change location URL by "popstate" when navigation is canceled', async () => {
            const prevUrl = '/should/not/be/this/url';
            const currUrl = '/should/not/change/location/url';
            const hooks = [
                sinon.stub().returns({
                    nextUrl: '/some/url',
                }),
                sinon.stub().returns({
                    navigationShouldBeCanceled: true,
                }),
                sinon.stub().returns(null),
                sinon.stub().returns(undefined),
            ];

            try {
                window.history.pushState(null, undefined, prevUrl);
                window.history.pushState(null, undefined, currUrl);
                await clock.runAllAsync();

                for (const hook of hooks) {
                    addNavigationHook(hook);
                }

                popstateEventHandler.resetHistory();
                beforeRoutingEventHandler.resetHistory();
                replaceState.resetHistory();

                window.history.back();
                await clock.runAllAsync();

                console.log(popstateEventHandler.getCall(0))

                chai.expect(popstateEventHandler.called).to.be.false;
                chai.expect(beforeRoutingEventHandler.called).to.be.false;
                chai.expect(replaceState.calledOnceWithExactly(null, undefined, window.location.origin + currUrl)).to.be.true;
            } finally {
                for (const hook of hooks) {
                    removeNavigationHook(hook);
                }
            }
        });

        it('should change location URL by "popstate" when navigation is not canceled', async () => {
            const prevUrl = '/should/change/location/url';
            const currUrl = '/should/not/be/this/url';
            const hooks = [
                sinon.stub().returns({
                    nextUrl: '/some/url',
                }),
                sinon.stub().returns(null),
                sinon.stub().returns(undefined),
            ];

            try {
                window.history.pushState(null, undefined, prevUrl);
                window.history.pushState(null, undefined, currUrl);
                await clock.runAllAsync();

                for (const hook of hooks) {
                    addNavigationHook(hook);
                }

                popstateEventHandler.resetHistory();
                beforeRoutingEventHandler.resetHistory();
                replaceState.resetHistory();

                window.history.back();
                await clock.runAllAsync();

                chai.expect(popstateEventHandler.called).to.be.true;
                chai.expect(beforeRoutingEventHandler.called).to.be.true;
                chai.expect(replaceState.called).to.be.false;
            } finally {
                for (const hook of hooks) {
                    removeNavigationHook(hook);
                }
            }
        });
    });
});
