import chai from 'chai';
import sinon from 'sinon';

import actionTypes from '../common/guard/actionTypes';
import GuardManager from './GuardManager';

describe('GuardManager', () => {
    const router = Object.freeze({
        match: sinon.stub(),
        navigateToUrl: () => {},
    });

    const pluginManager = Object.freeze({
        getTransitionHooksPlugin: sinon.stub(),
    });

    const transitionHooksPlugin = Object.freeze({
        getTransitionHooks: sinon.stub(),
    });

    afterEach(() => {
        router.match.reset();
        pluginManager.getTransitionHooksPlugin.reset();
        transitionHooksPlugin.getTransitionHooks.reset();
    });

    describe('should have access to a provided URL', () => {
        it('if transition hooks plugin does not exist', () => {
            pluginManager.getTransitionHooksPlugin.returns(null);

            const guardManager = new GuardManager(router, pluginManager);

            chai.expect(guardManager.hasAccessTo('/transition/hooks/plugin/does/not/exist')).to.be.true;
        });

        it('if router does not have a route that matches a provided URL', () => {
            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            router.match.returns({specialRole: 404});

            const guardManager = new GuardManager(router, pluginManager);

            chai.expect(guardManager.hasAccessTo('/router/does/not/have/route')).to.be.true;
        });

        it(`if none of hooks returns "${actionTypes.stopNavigation}" action type`, () => {
            const route = {routeId: 1, specialRole: null};
            const url = '/every/hook/does/not/return/stop/navigation';
            const hooks = [
                sinon.stub().returns({type: actionTypes.continue}),
                sinon.stub().returns({type: actionTypes.redirect}),
                sinon.stub().returns({type: null}),
                sinon.stub().returns({type: undefined}),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);
            router.match.returns(route);

            const guardManager = new GuardManager(router, pluginManager);

            chai.expect(guardManager.hasAccessTo(url)).to.be.true;

            for (const hook of hooks) {
                chai.expect(hook.calledOnceWith({route: {...route, url}, navigate: router.navigateToUrl})).to.be.true;
            }
        });
    });

    describe('should not have access to a provided URL', () => {
        it(`if some of hooks returns "${actionTypes.stopNavigation}" action type`, () => {
            const route = {routeId: 2, specialRole: null};
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

            const guardManager = new GuardManager(router, pluginManager);

            chai.expect(guardManager.hasAccessTo(url)).to.be.false;

            for (const hook of hooks) {
                chai.expect(hook.calledOnceWith({route: {...route, url}, navigate: router.navigateToUrl})).to.be.true;
            }
        });
    });
});
