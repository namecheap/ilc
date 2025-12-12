import * as chai from 'chai';
import sinon from 'sinon';

import { TransitionHookError } from '../common/transition-hooks/errors';
import { ActionType } from '../common/transition-hooks/ActionType';
import TransitionHooksExecutor from './TransitionHooksExecutor';

describe('TransitionHooksExecutor', () => {
    let clock;

    const route = Object.freeze({
        specialRole: null,
        meta: {
            protected: true,
        },
        reqUrl: '/some/url',
        route: '/some/url',
    });
    const prevRoute = Object.freeze({
        specialRole: null,
        meta: {
            protected: true,
        },
        reqUrl: '/other/url',
        route: '/other/url',
    });

    const errorHandler = sinon.spy((err) => console.error(err));

    const router = Object.freeze({
        getCurrentRoute: sinon.stub(),
        match: sinon.stub(),
        navigateToUrl: sinon.spy(),
    });

    const pluginManager = Object.freeze({
        getTransitionHooksPlugin: sinon.stub(),
    });

    const transitionHooksPlugin = Object.freeze({
        getTransitionHooks: sinon.stub(),
    });

    const logger = {
        info: sinon.spy(),
    };

    beforeEach(() => {
        clock = sinon.useFakeTimers();

        pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
        router.getCurrentRoute.returns(prevRoute);
    });

    afterEach(() => {
        clock.restore();

        errorHandler.resetHistory();
        router.match.reset();
        router.getCurrentRoute.reset();
        pluginManager.getTransitionHooksPlugin.reset();
        transitionHooksPlugin.getTransitionHooks.reset();

        logger.info.resetHistory();
    });

    describe('should have access to a provided URL', () => {
        it('if router does not have a route that matches a provided URL', () => {
            const hooks = [sinon.stub().returns({ type: ActionType.stopNavigation })];
            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns({ specialRole: 404 });

            const transitionHooksExecutor = new TransitionHooksExecutor(router, pluginManager, errorHandler, logger);

            chai.expect(transitionHooksExecutor.shouldNavigate('/router/does/not/have/route')).to.be.true;
        });

        it(`if none of hooks returns "${ActionType.stopNavigation}" or "${ActionType.redirect}" action types`, () => {
            const url = '/every/hook/does/not/return/stop/navigation';
            const hooks = [
                sinon.stub().returns({ type: ActionType.continue }),
                sinon.stub().returns({ type: ActionType.continue }),
                sinon.stub().returns({ type: null }),
                sinon.stub().returns({ type: undefined }),
            ];

            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns(route);

            const transitionHooksExecutor = new TransitionHooksExecutor(router, pluginManager, errorHandler, logger);

            chai.expect(transitionHooksExecutor.shouldNavigate(url)).to.be.true;

            for (const hook of hooks) {
                sinon.assert.calledOnceWithExactly(hook, {
                    route: { meta: route.meta, url: route.reqUrl, hostname: window.location.host, route: route.route },
                    prevRoute: {
                        meta: prevRoute.meta,
                        url: prevRoute.reqUrl,
                        hostname: window.location.host,
                        route: route.route,
                    },
                    navigate: router.navigateToUrl,
                });
            }
        });
    });

    describe('should not have access to a provided URL', () => {
        it(`if some of hooks throws an error`, () => {
            const error = new Error('Hi there! I am an error. So, should be shown 500 error page in this case');
            const url = '/some/hook/returns/stop/navigation';
            const hooks = [
                sinon.stub().returns({ type: ActionType.continue }),
                sinon.stub().throws(error),
                sinon.stub().returns({ type: true }),
                sinon.stub().returns({ type: 0 }),
            ];

            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns(route);

            const transitionHooksExecutor = new TransitionHooksExecutor(router, pluginManager, errorHandler, logger);

            chai.expect(transitionHooksExecutor.shouldNavigate(url)).to.be.false;
            sinon.assert.calledOnce(errorHandler);
            chai.expect(errorHandler.getCall(0).args[0]).to.have.property('cause', error);
            chai.expect(errorHandler.getCall(0).args[0]).to.be.instanceOf(TransitionHookError);
            chai.expect(errorHandler.getCall(0).args[0].data).to.be.eql({
                hookIndex: 1,
                url,
            });
            chai.expect(errorHandler.getCall(0).args[0].cause).to.be.eql(error);

            for (const hook of [hooks[0], hooks[1]]) {
                sinon.assert.calledOnceWithExactly(hook, {
                    route: { meta: route.meta, url: route.reqUrl, hostname: window.location.host, route: route.route },
                    prevRoute: {
                        meta: prevRoute.meta,
                        url: prevRoute.reqUrl,
                        hostname: window.location.host,
                        route: route.route,
                    },
                    navigate: router.navigateToUrl,
                });
            }

            for (const hook of [hooks[2], hooks[3]]) {
                sinon.assert.notCalled(hook);
            }
        });

        it(`if some of hooks returns "${ActionType.stopNavigation}" action type`, () => {
            const url = '/some/hook/returns/stop/navigation';
            const hooks = [
                sinon.stub().returns({ type: ActionType.continue }),
                sinon.stub().returns({ type: ActionType.stopNavigation }),
                sinon.stub().returns({ type: true }),
                sinon.stub().returns({ type: 0 }),
            ];

            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns(route);

            const transitionHooksExecutor = new TransitionHooksExecutor(router, pluginManager, errorHandler, logger);

            chai.expect(transitionHooksExecutor.shouldNavigate(url)).to.be.false;
            sinon.assert.calledOnceWithExactly(
                logger.info,
                `ILC: Stopped navigation due to the Route Guard with index #${1}`,
            );

            for (const hook of [hooks[0], hooks[1]]) {
                sinon.assert.calledOnceWithExactly(hook, {
                    route: { meta: route.meta, url: route.reqUrl, hostname: window.location.host, route: route.route },
                    prevRoute: {
                        meta: prevRoute.meta,
                        url: prevRoute.reqUrl,
                        hostname: window.location.host,
                        route: route.route,
                    },
                    navigate: router.navigateToUrl,
                });
            }

            for (const hook of [hooks[2], hooks[3]]) {
                sinon.assert.notCalled(hook);
            }
        });

        it(`if some of hooks returns "${ActionType.redirect}" action type`, async () => {
            const url = '/some/hook/returns/redirect/navigation';
            const hooks = [
                sinon.stub().returns({ type: ActionType.continue }),
                sinon.stub().returns({ type: ActionType.redirect, newLocation: url }),
                sinon.stub().returns({ type: false }),
                sinon.stub().returns({ type: 1 }),
            ];

            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns(route);

            const transitionHooksExecutor = new TransitionHooksExecutor(router, pluginManager, errorHandler, logger);

            chai.expect(transitionHooksExecutor.shouldNavigate(url)).to.be.false;
            sinon.assert.notCalled(router.navigateToUrl);

            for (const hook of [hooks[0], hooks[1]]) {
                sinon.assert.calledOnceWithExactly(hook, {
                    route: { meta: route.meta, url: route.reqUrl, hostname: window.location.host, route: route.route },
                    prevRoute: {
                        meta: prevRoute.meta,
                        url: prevRoute.reqUrl,
                        hostname: window.location.host,
                        route: route.route,
                    },
                    navigate: router.navigateToUrl,
                });
            }

            for (const hook of [hooks[2], hooks[3]]) {
                sinon.assert.notCalled(hook);
            }

            await clock.runAllAsync();

            sinon.assert.calledWithExactly(
                logger.info,
                `ILC: Redirect from "${route.reqUrl}" to "${url}" due to the Transition Hook with index #${1}`,
            );
            sinon.assert.calledWithExactly(router.navigateToUrl, url);
        });
    });
});
