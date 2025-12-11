import { expect } from 'chai';
import sinon, { type SinonStub, type SinonSpy } from 'sinon';
import { PerformanceTransitionHook } from './PerformanceTransitionHook';

interface MockLogger {
    info: SinonSpy;
}

interface MockNewRelic {
    addPageAction: SinonSpy;
}

describe('PerformanceTransitionHook', () => {
    let mockLogger: MockLogger;
    let currentPathGetter: SinonStub;
    let performanceNowStub: SinonStub;
    let originalNewRelic: any;

    beforeEach(() => {
        mockLogger = {
            info: sinon.spy(),
        };

        currentPathGetter = sinon.stub();

        // Stub performance.now()
        performanceNowStub = sinon.stub(performance, 'now');

        // Save original window.newrelic
        originalNewRelic = (window as any).newrelic;
    });

    afterEach(() => {
        performanceNowStub.restore();

        // Restore window.newrelic
        if (originalNewRelic === undefined) {
            delete (window as any).newrelic;
        } else {
            (window as any).newrelic = originalNewRelic;
        }

        sinon.resetHistory();
    });

    describe('constructor', () => {
        it('should create an instance with currentPathGetter and logger', () => {
            const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
            expect(hook).to.be.instanceOf(PerformanceTransitionHook);
        });

        it('should extend BaseTransitionHook', () => {
            const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
            expect(hook).to.have.property('beforeHandler');
            expect(hook).to.have.property('afterHandler');
        });
    });

    describe('beforeHandler', () => {
        it('should capture the start time using performance.now()', () => {
            performanceNowStub.returns(1000);

            const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
            hook.beforeHandler();

            expect(performanceNowStub.calledOnce).to.be.true;
        });
    });

    describe('afterHandler', () => {
        describe('performance measurement', () => {
            it('should calculate and log the time taken for route change', () => {
                performanceNowStub.onFirstCall().returns(1000);
                performanceNowStub.onSecondCall().returns(1250);

                currentPathGetter.returns({ route: '/test' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('/test');
                expect(mockLogger.info.firstCall.args[0]).to.include('250 milliseconds');
            });

            it('should convert time to integer milliseconds', () => {
                performanceNowStub.onFirstCall().returns(1000);
                performanceNowStub.onSecondCall().returns(1250.789);

                currentPathGetter.returns({ route: '/test' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                // Should parse to integer, so 250 not 250.789
                expect(mockLogger.info.firstCall.args[0]).to.include('250 milliseconds');
            });

            it('should handle very short route changes', () => {
                performanceNowStub.onFirstCall().returns(1000);
                performanceNowStub.onSecondCall().returns(1001.5);

                currentPathGetter.returns({ route: '/fast' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.firstCall.args[0]).to.include('1 milliseconds');
            });

            it('should handle long route changes', () => {
                performanceNowStub.onFirstCall().returns(1000);
                performanceNowStub.onSecondCall().returns(3500);

                currentPathGetter.returns({ route: '/slow' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.firstCall.args[0]).to.include('2500 milliseconds');
            });
        });

        describe('route handling', () => {
            beforeEach(() => {
                performanceNowStub.onFirstCall().returns(1000);
                performanceNowStub.onSecondCall().returns(1100);
            });

            it('should use route from currentPath when no specialRole', () => {
                currentPathGetter.returns({ route: '/home' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('"/home"');
            });

            it('should use special_<role> format when specialRole is present', () => {
                currentPathGetter.returns({ route: '/404', specialRole: '404' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('"special_404"');
            });

            it('should prioritize specialRole over route', () => {
                currentPathGetter.returns({ route: '/error', specialRole: '500' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.firstCall.args[0]).to.include('"special_500"');
                expect(mockLogger.info.firstCall.args[0]).to.not.include('/error');
            });

            it('should handle undefined route', () => {
                currentPathGetter.returns({});

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('"undefined"');
            });
        });

        describe('New Relic integration', () => {
            beforeEach(() => {
                performanceNowStub.onFirstCall().returns(1000);
                performanceNowStub.onSecondCall().returns(1250);
            });

            it('should call newrelic.addPageAction when newrelic is available', () => {
                const mockNewRelic: MockNewRelic = {
                    addPageAction: sinon.spy(),
                };
                (window as any).newrelic = mockNewRelic;

                currentPathGetter.returns({ route: '/test' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockNewRelic.addPageAction.calledOnce).to.be.true;
                expect(mockNewRelic.addPageAction.calledWith('routeChange', { time: 250, route: '/test' })).to.be.true;
            });

            it('should send correct route to newrelic with specialRole', () => {
                const mockNewRelic: MockNewRelic = {
                    addPageAction: sinon.spy(),
                };
                (window as any).newrelic = mockNewRelic;

                currentPathGetter.returns({ route: '/error', specialRole: '500' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockNewRelic.addPageAction.calledOnce).to.be.true;
                expect(mockNewRelic.addPageAction.calledWith('routeChange', { time: 250, route: 'special_500' })).to.be
                    .true;
            });

            it('should not throw error when newrelic is not available', () => {
                delete (window as any).newrelic;

                currentPathGetter.returns({ route: '/test' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);

                expect(() => {
                    hook.beforeHandler();
                    hook.afterHandler();
                }).to.not.throw();

                expect(mockLogger.info.calledOnce).to.be.true;
            });

            it('should not throw error when newrelic exists but addPageAction is missing', () => {
                (window as any).newrelic = {};

                currentPathGetter.returns({ route: '/test' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);

                expect(() => {
                    hook.beforeHandler();
                    hook.afterHandler();
                }).to.not.throw();

                expect(mockLogger.info.calledOnce).to.be.true;
            });

            it('should not call addPageAction when it does not exist', () => {
                (window as any).newrelic = {
                    someOtherMethod: sinon.spy(),
                };

                currentPathGetter.returns({ route: '/test' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.calledOnce).to.be.true;
                // Should not throw and should continue execution
            });

            it('should handle newrelic being null', () => {
                (window as any).newrelic = null;

                currentPathGetter.returns({ route: '/test' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);

                expect(() => {
                    hook.beforeHandler();
                    hook.afterHandler();
                }).to.not.throw();
            });

            it('should send integer time value to newrelic', () => {
                const mockNewRelic: MockNewRelic = {
                    addPageAction: sinon.spy(),
                };
                (window as any).newrelic = mockNewRelic;

                performanceNowStub.onFirstCall().returns(1000);
                performanceNowStub.onSecondCall().returns(1250.789);

                currentPathGetter.returns({ route: '/test' });

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockNewRelic.addPageAction.firstCall.args[1].time).to.equal(250);
            });
        });

        describe('multiple transitions', () => {
            it('should measure each transition independently', () => {
                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);

                // First transition
                performanceNowStub.onCall(0).returns(1000);
                performanceNowStub.onCall(1).returns(1200);
                currentPathGetter.returns({ route: '/page1' });

                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.firstCall.args[0]).to.include('200 milliseconds');

                mockLogger.info.resetHistory();

                // Second transition
                performanceNowStub.onCall(2).returns(2000);
                performanceNowStub.onCall(3).returns(2500);
                currentPathGetter.returns({ route: '/page2' });

                hook.beforeHandler();
                hook.afterHandler();

                expect(mockLogger.info.firstCall.args[0]).to.include('500 milliseconds');
            });

            it('should track newrelic events for multiple transitions', () => {
                const mockNewRelic: MockNewRelic = {
                    addPageAction: sinon.spy(),
                };
                (window as any).newrelic = mockNewRelic;

                const hook = new PerformanceTransitionHook(currentPathGetter, mockLogger);

                // First transition
                performanceNowStub.onCall(0).returns(1000);
                performanceNowStub.onCall(1).returns(1100);
                currentPathGetter.returns({ route: '/page1' });
                hook.beforeHandler();
                hook.afterHandler();

                // Second transition
                performanceNowStub.onCall(2).returns(2000);
                performanceNowStub.onCall(3).returns(2300);
                currentPathGetter.returns({ route: '/page2' });
                hook.beforeHandler();
                hook.afterHandler();

                expect(mockNewRelic.addPageAction.callCount).to.equal(2);
                expect(mockNewRelic.addPageAction.firstCall.args[1]).to.deep.equal({ time: 100, route: '/page1' });
                expect(mockNewRelic.addPageAction.secondCall.args[1]).to.deep.equal({ time: 300, route: '/page2' });
            });
        });
    });
});
