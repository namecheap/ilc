const chai = require('chai');
const sinon = require('sinon');

const nock = require('nock');
const createApp = require('./app');
const helpers = require('../tests/helpers');
const actionTypes = require('../common/guard/actionTypes');
const GuardManager = require('./GuardManager');

describe('GuardManager', () => {
    const transitionHooksPlugin = Object.freeze({
        getTransitionHooks: sinon.stub(),
    });
    const pluginManager = Object.freeze({
        ...helpers.getPluginManagerMock(),
        getTransitionHooksPlugin: sinon.stub(),
    });

    afterEach(() => {
        transitionHooksPlugin.getTransitionHooks.reset();
        pluginManager.getTransitionHooksPlugin.reset();
    });

    describe('e2e tests', () => {
        nock('http://apps.test').persist(true).get(/.?/).reply(200, function (url) {
            return JSON.stringify({
                url,
                headers: this.req.headers,
            })
        });

        it(`should redirect when some of hooks resolves with "${actionTypes.redirect}" action type`, async () => {
            let res;

            const newLocation = '/should/be/this/location';
            const hooks = [
                sinon.stub().resolves({type: actionTypes.continue}),
                sinon.stub().resolves({type: actionTypes.stopNavigation}),
                sinon.stub().resolves({type: actionTypes.redirect, newLocation}),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);

            const app = createApp(helpers.getRegistryMock(), pluginManager);

            try {
                res = await app.inject({method: 'GET', url: '/all'});
            } finally {
                app.close();
            }

            chai.expect(res.statusCode).to.be.equal(302);
            chai.expect(res.headers.location).to.be.equal(newLocation);
        });

        it(`should not redirect when none of hooks resolves with "${actionTypes.redirect}" action type`, async () => {
            let res;

            const hooks = [
                sinon.stub().resolves({type: actionTypes.continue}),
                sinon.stub().resolves({type: actionTypes.stopNavigation}),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);

            app = createApp(helpers.getRegistryMock(), pluginManager);

            try {
                res = await app.inject({method: 'GET', url: '/all'});
            } finally {
                app.close();
            }

            chai.expect(res.statusCode).to.be.equal(200);
        });
    });

    describe('unit tests', () => {
        const route = Object.freeze({
            id: 'routeId',
            route: '/route',
        });
        const req = Object.freeze({
            raw: {
                router: {
                    getRoute: () => route,
                },
            },
        });
        const res = Object.freeze({
            redirect: sinon.spy(),
        });

        afterEach(() => {
            res.redirect.resetHistory();
        });

        describe('should have access to a provided URL', () => {
            it('if transition hooks plugin does not exist', async () => {
                pluginManager.getTransitionHooksPlugin.returns(null);

                const hasAccess = await new GuardManager(pluginManager).hasAccessTo(req, res);

                chai.expect(res.redirect.called).to.be.false;
                chai.expect(hasAccess).to.be.true;
            });

            it('if transition hooks are non existent', async () => {
                pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
                transitionHooksPlugin.getTransitionHooks.returns([]);

                const hasAccess = await new GuardManager(pluginManager).hasAccessTo(req, res);

                chai.expect(res.redirect.called).to.be.false;
                chai.expect(hasAccess).to.be.true;
            });

            it(`if none of hooks resolves with "${actionTypes.redirect}" action type`, async () => {
                const hooks = [
                    sinon.stub().resolves({type: actionTypes.continue}),
                    sinon.stub().resolves({type: actionTypes.stopNavigation}),
                ];

                pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
                transitionHooksPlugin.getTransitionHooks.returns(hooks);

                const hasAccess = await new GuardManager(pluginManager).hasAccessTo(req, res);

                for (const hook of hooks) {
                    chai.expect(hook.calledOnceWith({
                        route,
                        req: req.raw,
                    })).to.be.true;
                }

                chai.expect(res.redirect.called).to.be.false;
                chai.expect(hasAccess).to.be.true;
            });
        });

        describe('should not have access to a provided URL', () => {
            it(`if some of hooks resolves with "${actionTypes.redirect}" action type`, async () => {
                const newLocation = '/should/be/this/location';
                const hooks = [
                    sinon.stub().resolves({type: actionTypes.continue}),
                    sinon.stub().resolves({type: actionTypes.stopNavigation}),
                    sinon.stub().resolves({type: actionTypes.continue}),
                    sinon.stub().resolves({type: actionTypes.redirect, newLocation}),
                ];

                pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
                transitionHooksPlugin.getTransitionHooks.returns(hooks);

                const hasAccess = await new GuardManager(pluginManager).hasAccessTo(req, res);

                for (const hook of hooks) {
                    chai.expect(hook.calledOnceWith({
                        route,
                        req: req.raw,
                    })).to.be.true;
                }

                chai.expect(res.redirect.calledOnceWithExactly(newLocation)).to.be.true;
                chai.expect(hasAccess).to.be.false;
            });
        });
    });
});
