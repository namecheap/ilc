const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

chai.use(chaiAsPromised);

const nock = require('nock');
const createApp = require('./app');
const helpers = require('../tests/helpers');
const { TransitionHookError } = require('../common/transition-hooks/errors');
const { ActionType } = require('../common/transition-hooks/ActionType');
const { TransitionHooksExecutor } = require('./TransitionHooksExecutor');
const { context } = require('./context/context');

describe('TransitionHooksExecutor', () => {
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
        before(() => {
            helpers.setupMockServersForApps();
        });

        after(() => {
            nock.cleanAll();
        });

        it(`should redirect when some of hooks resolves with "${ActionType.redirect}" action type`, async () => {
            let res;

            const newLocation = '/should/be/this/location';
            const hooks = [
                sinon.stub().resolves({ type: ActionType.continue }),
                sinon.stub().resolves({ type: ActionType.redirect, newLocation }),
                sinon.stub().resolves({ type: ActionType.continue }),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);

            const app = createApp(helpers.getRegistryMock(), pluginManager, context);

            try {
                res = await app.inject({ method: 'GET', url: '/all' });
            } finally {
                app.close();
            }

            chai.expect(res.statusCode).to.be.equal(302);
            chai.expect(res.headers.location).to.be.equal(newLocation);
        });

        it(`should redirect with custom HTTP code`, async () => {
            let res;

            const newLocation = '/should/be/this/location';
            const hooks = [
                sinon.stub().resolves({ type: ActionType.continue }),
                sinon.stub().resolves({ type: ActionType.redirect, newLocation, code: 308 }),
                sinon.stub().resolves({ type: ActionType.continue }),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);

            const app = createApp(helpers.getRegistryMock(), pluginManager, context);

            try {
                res = await app.inject({ method: 'GET', url: '/all' });
            } finally {
                app.close();
            }

            chai.expect(res.statusCode).to.be.equal(308);
            chai.expect(res.headers.location).to.be.equal(newLocation);
        });

        it(`should not redirect when none of hooks resolves with "${ActionType.redirect}" action type`, async () => {
            let res;

            const hooks = [
                sinon.stub().resolves({ type: ActionType.continue }),
                sinon.stub().resolves({ type: ActionType.continue }),
            ];

            pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
            transitionHooksPlugin.getTransitionHooks.returns(hooks);

            const app = createApp(helpers.getRegistryMock(), pluginManager, context);

            try {
                res = await app.inject({ method: 'GET', url: '/all' });
            } finally {
                app.close();
            }

            chai.expect(res.statusCode).to.be.equal(200);
        });
    });

    describe('unit tests', () => {
        const route = Object.freeze({
            id: 'routeId',
            specialRole: null,
            meta: {
                protected: true,
            },
            reqUrl: '/some/unlocalized/and/processed/url',
            route: '/some/*',
        });
        const log = Object.freeze({
            info: () => {},
            fatal: () => {},
            error: () => {},
            warn: () => {},
            debug: () => {},
            trace: () => {},
        });
        const rawReq = Object.freeze({
            router: {
                getRoute: () => route,
            },
        });
        const req = {
            raw: rawReq,
            log,
            hostname: 'test.com',
        };

        describe('should have access to a provided URL', () => {
            it('if transition hooks are non existent', async () => {
                pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
                transitionHooksPlugin.getTransitionHooks.returns([]);

                const redirectTo = await new TransitionHooksExecutor(pluginManager).redirectTo(req);

                chai.expect(redirectTo).to.be.null;
            });

            it('if the route has special role', async () => {
                pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
                transitionHooksPlugin.getTransitionHooks.returns([]);

                const route = Object.freeze({
                    specialRole: 404,
                });
                const rawReq = Object.freeze({
                    router: {
                        getRoute: () => route,
                    },
                });
                const redirectTo = await new TransitionHooksExecutor(pluginManager).redirectTo({ ...req, raw: rawReq });

                chai.expect(redirectTo).to.be.null;
            });

            it(`if none of hooks resolves with "${ActionType.redirect}" action type`, async () => {
                const hooks = [
                    sinon.stub().resolves({ type: ActionType.continue }),
                    sinon.stub().resolves({ type: ActionType.continue }),
                ];

                pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
                transitionHooksPlugin.getTransitionHooks.returns(hooks);

                const redirectTo = await new TransitionHooksExecutor(pluginManager).redirectTo(req);

                for (const hook of hooks) {
                    chai.expect(
                        hook.calledOnceWith({
                            route: { meta: route.meta, url: route.reqUrl, hostname: req.hostname, route: route.route },
                            req: rawReq,
                            log,
                        }),
                    ).to.be.true;
                }

                chai.expect(redirectTo).to.be.null;
            });
        });

        describe('should not have access to a provided URL', () => {
            it(`if some of hooks rejects with an error`, async () => {
                const error = new Error('Hi there! I am an error. So server should redirect to 500 error page.');
                const hooks = [
                    sinon.stub().resolves({ type: ActionType.continue }),
                    sinon.stub().rejects(error),
                    sinon.stub().resolves({ type: ActionType.continue }),
                    sinon.stub().resolves({ type: ActionType.continue }),
                ];

                pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
                transitionHooksPlugin.getTransitionHooks.returns(hooks);

                await chai
                    .expect(new TransitionHooksExecutor(pluginManager).redirectTo(req))
                    .to.eventually.be.rejected.then((rejectedError) => {
                        chai.expect(rejectedError).to.be.instanceOf(TransitionHookError);
                        chai.expect(rejectedError.data).to.be.eql({
                            hookIndex: 1,
                        });
                        chai.expect(rejectedError.cause).to.be.eql(error);
                    });

                for (const hook of [hooks[0], hooks[1]]) {
                    chai.expect(
                        hook.calledOnceWith({
                            route: { meta: route.meta, url: route.reqUrl, hostname: req.hostname, route: route.route },
                            req: rawReq,
                            log,
                        }),
                    ).to.be.true;
                }

                for (const hook of [hooks[2], hooks[3]]) {
                    chai.expect(hook.called).to.be.false;
                }
            });

            it(`if some of hooks resolves with "${ActionType.redirect}" action type`, async () => {
                const newLocation = '/should/be/this/location';
                const hooks = [
                    sinon.stub().resolves({ type: ActionType.continue }),
                    sinon.stub().resolves({ type: ActionType.redirect, newLocation }),
                    sinon.stub().resolves({ type: ActionType.continue }),
                    sinon.stub().resolves({ type: ActionType.continue }),
                ];

                pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
                transitionHooksPlugin.getTransitionHooks.returns(hooks);

                const redirectTo = await new TransitionHooksExecutor(pluginManager).redirectTo(req);

                for (const hook of [hooks[0], hooks[1]]) {
                    chai.expect(
                        hook.calledOnceWith({
                            route: { meta: route.meta, url: route.reqUrl, hostname: req.hostname, route: route.route },
                            req: rawReq,
                            log,
                        }),
                    ).to.be.true;
                }

                for (const hook of [hooks[2], hooks[3]]) {
                    chai.expect(hook.called).to.be.false;
                }

                chai.expect(redirectTo).to.eql({ code: 302, location: '/should/be/this/location' });
            });
            it(`if some of hooks resolves with "${ActionType.redirect}" action type and code`, async () => {
                const newLocation = '/should/be/this/location';
                const hooks = [
                    sinon.stub().resolves({ type: ActionType.continue }),
                    sinon.stub().resolves({ type: ActionType.redirect, newLocation, code: 307 }),
                    sinon.stub().resolves({ type: ActionType.continue }),
                    sinon.stub().resolves({ type: ActionType.continue }),
                ];

                pluginManager.getTransitionHooksPlugin.returns(transitionHooksPlugin);
                transitionHooksPlugin.getTransitionHooks.returns(hooks);

                const redirectTo = await new TransitionHooksExecutor(pluginManager).redirectTo(req);

                for (const hook of [hooks[0], hooks[1]]) {
                    chai.expect(
                        hook.calledOnceWith({
                            route: { meta: route.meta, url: route.reqUrl, hostname: req.hostname, route: route.route },
                            req: rawReq,
                            log,
                        }),
                    ).to.be.true;
                }

                for (const hook of [hooks[2], hooks[3]]) {
                    chai.expect(hook.called).to.be.false;
                }

                chai.expect(redirectTo).to.eql({ code: 307, location: '/should/be/this/location' });
            });
        });
    });
});
