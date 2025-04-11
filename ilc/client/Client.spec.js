import { Client } from './Client';
import singleSpaEvents from './constants/singleSpaEvents';
import { TransitionManager } from './TransitionManager/TransitionManager';

describe('Client', () => {
    let client;
    let mockConfigRoot;
    let mockRouter;

    beforeEach(() => {
        mockConfigRoot = {
            isGlobalSpinnerEnabled: () => false,
            getSettingsByKey: () => ({}),
            getConfigForApps: () => ({}),
            getConfigForRoutes: () => [],
            getConfigForSpecialRoutesByKey: () => ({ slots: {} }),
            getConfig: () => ({
                settings: {},
                routes: [
                    {
                        route: '*',
                        next: false,
                        template: 'commonTemplate',
                        slots: {},
                    },
                ],
            }),
        };

        mockRouter = {
            getCurrentRoute: () => ({
                basePath: '/base',
                reqUrl: '/base/path',
            }),
        };
        window.ilcApps = [];

        client = new Client(mockConfigRoot);
        client.router = mockRouter; // Inject mock router
    });

    afterEach(() => {
        client.destroy();
    });

    it('should call the handler when a route change event occurs', (done) => {
        const handler = sinon.spy();

        // Add the route change handler
        const removeHandler = window.ILC.onRouteChange(handler);

        // Simulate a single-spa routing event
        const routingEvent = new CustomEvent(singleSpaEvents.ROUTING_EVENT);
        window.dispatchEvent(routingEvent);

        // Assert that the handler was called
        setTimeout(() => {
            expect(handler.calledOnce).to.be.true;

            // Assert that the handler received the correct arguments
            expect(handler.args[0][0]).to.equal(routingEvent);
            // Remove the handler and ensure it no longer listens
            removeHandler();
            window.dispatchEvent(routingEvent);
            setTimeout(() => {
                expect(handler.calledOnce).to.be.true; // No additional calls
                done();
            }, 0);
        }, 0);
    });
});
