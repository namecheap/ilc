import { expect } from 'chai';
import sinon, { type SinonStub, type SinonSpy } from 'sinon';
import { TitleCheckerTransitionHook } from './TitleCheckerTransitionHook';

interface MockLogger {
    info: SinonSpy;
}

interface CurrentPath {
    route?: string;
    specialRole?: string;
}

describe('TitleCheckerTransitionHook', () => {
    let mockLogger: MockLogger;
    let currentPathGetter: SinonStub;
    let originalTitle: string;

    beforeEach(() => {
        mockLogger = {
            info: sinon.spy(),
        };

        currentPathGetter = sinon.stub();

        // Save original title and reset
        // Note: Source code uses document.head.title (non-standard)
        originalTitle = (document.head as any).title || '';
        (document.head as any).title = '';
    });

    afterEach(() => {
        // Restore original title
        (document.head as any).title = originalTitle;
        sinon.resetHistory();
    });

    describe('constructor', () => {
        it('should create an instance with currentPathGetter and logger', () => {
            const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);
            expect(hook).to.be.instanceOf(TitleCheckerTransitionHook);
        });

        it('should extend BaseTransitionHook', () => {
            const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);
            expect(hook).to.have.property('beforeHandler');
            expect(hook).to.have.property('afterHandler');
        });
    });

    describe('beforeHandler', () => {
        it('should capture the current document title', () => {
            // Note: document.head.title is used in the source, which is non-standard
            // In the test environment, we need to work with document.title
            (document.head as any).title = 'Test Title';
            const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

            hook.beforeHandler();

            // Change title after beforeHandler
            (document.head as any).title = 'Changed Title';

            currentPathGetter.returns({ route: '/test' });
            hook.afterHandler();

            // Should not log warning because title changed
            expect(mockLogger.info.called).to.be.false;
        });

        it('should capture empty title', () => {
            (document.head as any).title = '';
            const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

            hook.beforeHandler();

            currentPathGetter.returns({ route: '/test' });
            hook.afterHandler();

            // Should log warning about empty title
            expect(mockLogger.info.calledOnce).to.be.true;
            expect(mockLogger.info.firstCall.args[0]).to.include('<empty>');
        });
    });

    describe('afterHandler', () => {
        describe('on first render (SSR)', () => {
            it('should not log warning when title does not change on SSR render', () => {
                (document.head as any).title = 'SSR Title';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                hook.beforeHandler();
                currentPathGetter.returns({ route: '/test' });
                hook.afterHandler();

                // On SSR render, no warning should be logged even if title doesn't change
                expect(mockLogger.info.called).to.be.false;
            });

            it('should log warning if title is empty on SSR render', () => {
                (document.head as any).title = '';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                hook.beforeHandler();
                currentPathGetter.returns({ route: '/test' });
                hook.afterHandler();

                // Should log about empty title
                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('<empty>');
            });
        });

        describe('after first render (client-side)', () => {
            it('should log warning when title does not change on client-side navigation', () => {
                (document.head as any).title = 'Initial Title';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First render (SSR)
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/first' });
                hook.afterHandler();

                mockLogger.info.resetHistory();

                // Second render (client-side) - title doesn't change
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/second' });
                hook.afterHandler();

                // Should log warning because title didn't change
                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('not mutate <title>');
                expect(mockLogger.info.firstCall.args[0]).to.include('Initial Title');
                expect(mockLogger.info.firstCall.args[0]).to.include('/second');
            });

            it('should not log warning when title changes on client-side navigation', () => {
                (document.head as any).title = 'Initial Title';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First render (SSR)
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/first' });
                hook.afterHandler();

                mockLogger.info.resetHistory();

                // Second render (client-side) - title changes
                hook.beforeHandler();
                (document.head as any).title = 'New Title';
                currentPathGetter.returns({ route: '/second' });
                hook.afterHandler();

                // Should not log warning because title changed
                expect(mockLogger.info.called).to.be.false;
            });

            it('should log warning when title becomes empty on client-side navigation', () => {
                (document.head as any).title = 'Initial Title';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First render (SSR)
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/first' });
                hook.afterHandler();

                mockLogger.info.resetHistory();

                // Second render (client-side) - title becomes empty
                hook.beforeHandler();
                (document.head as any).title = '';
                currentPathGetter.returns({ route: '/second' });
                hook.afterHandler();

                // Should log warning about empty title
                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('<empty>');
            });

            it('should format empty title as <empty> in warning message', () => {
                (document.head as any).title = '';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First render (SSR)
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/first' });
                hook.afterHandler();

                mockLogger.info.resetHistory();

                // Second render (client-side) - title stays empty
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/second' });
                hook.afterHandler();

                // Should log two warnings: one for not mutating, one for being empty
                expect(mockLogger.info.callCount).to.equal(2);
                expect(mockLogger.info.firstCall.args[0]).to.include('Previous title is <empty>');
                expect(mockLogger.info.secondCall.args[0]).to.include('but <title> is <empty>');
            });
        });

        describe('route handling', () => {
            it('should use route from currentPath when no specialRole', () => {
                (document.head as any).title = 'Test Title';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First render
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/home' });
                hook.afterHandler();

                mockLogger.info.resetHistory();

                // Second render - title doesn't change
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/about' });
                hook.afterHandler();

                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('/about');
            });

            it('should use special_<role> format when specialRole is present', () => {
                (document.head as any).title = 'Test Title';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First render
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/404', specialRole: '404' });
                hook.afterHandler();

                mockLogger.info.resetHistory();

                // Second render - title doesn't change
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/500', specialRole: '500' });
                hook.afterHandler();

                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('special_500');
            });

            it('should handle undefined route', () => {
                (document.head as any).title = 'Test Title';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First render
                hook.beforeHandler();
                currentPathGetter.returns({});
                hook.afterHandler();

                mockLogger.info.resetHistory();

                // Second render - title doesn't change
                hook.beforeHandler();
                currentPathGetter.returns({});
                hook.afterHandler();

                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('undefined');
            });

            it('should prioritize specialRole over route', () => {
                (document.head as any).title = 'Test Title';
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First render
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/error', specialRole: 'error' });
                hook.afterHandler();

                mockLogger.info.resetHistory();

                // Second render - title doesn't change
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/error', specialRole: 'error' });
                hook.afterHandler();

                expect(mockLogger.info.calledOnce).to.be.true;
                expect(mockLogger.info.firstCall.args[0]).to.include('special_error');
                expect(mockLogger.info.firstCall.args[0]).to.not.include('/error');
            });
        });

        describe('multiple transitions', () => {
            it('should track state correctly across multiple transitions', () => {
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First transition (SSR) - no warning
                (document.head as any).title = 'Title 1';
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/page1' });
                hook.afterHandler();
                expect(mockLogger.info.called).to.be.false;

                mockLogger.info.resetHistory();

                // Second transition - title doesn't change - should warn
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/page2' });
                hook.afterHandler();
                expect(mockLogger.info.calledOnce).to.be.true;

                mockLogger.info.resetHistory();

                // Third transition - title changes - no warning
                hook.beforeHandler();
                (document.head as any).title = 'Title 2';
                currentPathGetter.returns({ route: '/page3' });
                hook.afterHandler();
                expect(mockLogger.info.called).to.be.false;

                mockLogger.info.resetHistory();

                // Fourth transition - title doesn't change - should warn
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/page4' });
                hook.afterHandler();
                expect(mockLogger.info.calledOnce).to.be.true;
            });

            it('should correctly identify when title changes from one value to another', () => {
                const hook = new TitleCheckerTransitionHook(currentPathGetter, mockLogger);

                // First transition
                (document.head as any).title = 'Original Title';
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/page1' });
                hook.afterHandler();

                // Second transition - title changes
                hook.beforeHandler();
                (document.head as any).title = 'New Title';
                currentPathGetter.returns({ route: '/page2' });
                hook.afterHandler();

                // Third transition - title stays the same as "New Title"
                hook.beforeHandler();
                currentPathGetter.returns({ route: '/page3' });
                hook.afterHandler();

                // Should only log warning on the third transition
                expect(mockLogger.info.callCount).to.equal(1);
                expect(mockLogger.info.firstCall.args[0]).to.include('New Title');
            });
        });
    });
});
