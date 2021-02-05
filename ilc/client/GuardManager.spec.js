import chai from 'chai';
import sinon from 'sinon';

import errors from '../common/guard/errors';
import actionTypes from '../common/guard/actionTypes';
import GuardManager from './GuardManager';

describe('GuardManager', () => {
    let clock;

    const route = Object.freeze({
        routeId: 1,
        specialRole: null,
        meta: {
            protected: true,
        },
        reqUrl: '/some/url',
    });

    const errorHandler = sinon.stub();

    const router = Object.freeze({
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
        log: sinon.spy(),
    };

    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();

        errorHandler.reset();
        router.match.reset();
        pluginManager.getTransitionHooksPlugin.reset();
        transitionHooksPlugin.getTransitionHooks.reset();

        logger.log.resetHistory();
    });

    describe('should have access to a provided URL', () => {
        it('if transition hooks plugin does not exist', () => {
            pluginManager.getTransitionHooksPlugin.returns(null);

            const guardManager = new GuardManager(router, pluginManager, errorHandler, logger);

            chai.expect(guardManager.hasAccessTo('/transition/hooks/plugin/does/not/exist')).to.be.true;
        });

        it('if router does not have a route that matches a provided URL', () => {
            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            router.match.returns({specialRole: 404});

            const guardManager = new GuardManager(router, pluginManager, errorHandler, logger);

            chai.expect(guardManager.hasAccessTo('/router/does/not/have/route')).to.be.true;
        });

        it(`if none of hooks returns "${actionTypes.stopNavigation}" or "${actionTypes.redirect}" action types`, () => {
            const url = '/every/hook/does/not/return/stop/navigation';
            const hooks = [
                sinon.stub().returns({type: actionTypes.continue}),
                sinon.stub().returns({type: actionTypes.continue}),
                sinon.stub().returns({type: null}),
                sinon.stub().returns({type: undefined}),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns(route);

            const guardManager = new GuardManager(router, pluginManager, errorHandler, logger);

            chai.expect(guardManager.hasAccessTo(url)).to.be.true;

            for (const hook of hooks) {
                chai.expect(hook.calledOnceWith({route: {meta: route.meta, url: route.reqUrl}, navigate: router.navigateToUrl})).to.be.true;
            }
        });
    });

    describe('should not have access to a provided URL', () => {
        it(`if some of hooks throws an error`, () => {
            const error = new Error('Hi there! I am an error. So, should be shown 500 error page in this case');
            const url = '/some/hook/returns/stop/navigation';
            const hooks = [
                sinon.stub().returns({type: actionTypes.continue}),
                sinon.stub().throws(error),
                sinon.stub().returns({type: true}),
                sinon.stub().returns({type: 0}),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns(route);

            const guardManager = new GuardManager(router, pluginManager, errorHandler, logger);

            chai.expect(guardManager.hasAccessTo(url)).to.be.false;
            chai.expect(errorHandler.calledOnce).to.be.true;
            chai.expect(errorHandler.getCall(0).args[0]).to.have.property('cause', error);
            chai.expect(errorHandler.getCall(0).args[0]).to.be.instanceOf(errors.GuardTransitionHookError);
            chai.expect(errorHandler.getCall(0).args[0].data).to.be.eql({
                hookIndex: 1,
                url,
            });
            chai.expect(errorHandler.getCall(0).args[0].cause).to.be.eql(error);

            for (const hook of [hooks[0], hooks[1]]) {
                chai.expect(hook.calledOnceWith({route: {meta: route.meta, url: route.reqUrl}, navigate: router.navigateToUrl})).to.be.true;
            }

            for (const hook of [hooks[2], hooks[3]]) {
                chai.expect(hook.called).to.be.false;
            }
        });

        it(`if some of hooks returns "${actionTypes.stopNavigation}" action type`, () => {
            const url = '/some/hook/returns/stop/navigation';
            const hooks = [
                sinon.stub().returns({type: actionTypes.continue}),
                sinon.stub().returns({type: actionTypes.stopNavigation}),
                sinon.stub().returns({type: true}),
                sinon.stub().returns({type: 0}),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns(route);

            const guardManager = new GuardManager(router, pluginManager, errorHandler, logger);

            chai.expect(guardManager.hasAccessTo(url)).to.be.false;
            chai.expect(logger.log.calledOnceWith(`ILC: Stopped navigation due to the Route Guard with index #${1}`)).to.be.true;

            for (const hook of [hooks[0], hooks[1]]) {
                chai.expect(hook.calledOnceWith({route: {meta: route.meta, url: route.reqUrl}, navigate: router.navigateToUrl})).to.be.true;
            }

            for (const hook of [hooks[2], hooks[3]]) {
                chai.expect(hook.called).to.be.false;
            }
        });

        it(`if some of hooks returns "${actionTypes.redirect}" action type`, async () => {
            const url = '/some/hook/returns/redirect/navigation';
            const hooks = [
                sinon.stub().returns({type: actionTypes.continue}),
                sinon.stub().returns({type: actionTypes.redirect, newLocation: url}),
                sinon.stub().returns({type: false}),
                sinon.stub().returns({type: 1}),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns(route);

            const guardManager = new GuardManager(router, pluginManager, errorHandler, logger);

            chai.expect(guardManager.hasAccessTo(url)).to.be.false;
            chai.expect(router.navigateToUrl.called).to.be.false;

            for (const hook of [hooks[0], hooks[1]]) {
                chai.expect(hook.calledOnceWith({route: {meta: route.meta, url: route.reqUrl}, navigate: router.navigateToUrl})).to.be.true;
            }

            for (const hook of [hooks[2], hooks[3]]) {
                chai.expect(hook.called).to.be.false;
            }

            await clock.runAllAsync();

            chai.expect(logger.log.calledWithExactly(`ILC: Redirect from "${route.reqUrl}" to "${url}" due to the Route Guard with index #${1}`)).to.be.true;
            chai.expect(router.navigateToUrl.calledWithExactly(url)).to.be.true;
        });
    });
});
