import chai from 'chai';
import sinon from 'sinon';

import {slotWillBe} from './TransactionManager';
import {createFactory} from './isActiveFactory';

describe('is active factory', () => {
    const dispatchSingleSpaAppChangeEvent = () => window.dispatchEvent(new Event('single-spa:app-change'));

    const triggerAppChange = sinon.spy();
    const handlePageTransaction = sinon.spy();

    const router = {
        getPrevRouteProps: sinon.stub(),
        getCurrentRouteProps: sinon.stub(),
        getCurrentRoute: sinon.stub(),
        getPrevRoute: sinon.stub(),
    };

    const appName = 'navbar-spa';
    const slotName = 'navbar';

    const routeThatDoesNotHaveProvidedSlot = {
        slots: {
            [`not-${slotName}`]: {
                appName: `not-${appName}`,
            },
        },
    };
    const routeThatHasProvidedSlot = {
        slots: {
            [slotName]: {
                appName,
            },
        },
    };

    let isActive;
    let clock;

    beforeEach(() => {
        const isActiveFactory = createFactory(triggerAppChange, handlePageTransaction, slotWillBe);
        isActive = isActiveFactory(router, appName, slotName);

        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        router.getPrevRouteProps.reset();
        router.getCurrentRouteProps.reset();
        router.getCurrentRoute.reset();
        router.getPrevRoute.reset();

        handlePageTransaction.resetHistory();
        triggerAppChange.resetHistory();

        clock.restore();
    });

    it('should return true when a slot is going to be rendered', async () => {
        router.getCurrentRoute.onFirstCall().returns(routeThatHasProvidedSlot);
        router.getPrevRoute.onFirstCall().returns(routeThatDoesNotHaveProvidedSlot);

        chai.expect(isActive()).to.be.true;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(triggerAppChange.called).to.be.false;
        chai.expect(handlePageTransaction.calledOnceWithExactly(slotName, slotWillBe.rendered)).to.be.true;
    });

    it('should return false when a slot is going to be removed', async () => {
        router.getCurrentRoute.onFirstCall().returns(routeThatDoesNotHaveProvidedSlot);
        router.getPrevRoute.onFirstCall().returns(routeThatHasProvidedSlot);

        chai.expect(isActive()).to.be.false;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(triggerAppChange.called).to.be.false;
        chai.expect(handlePageTransaction.calledOnceWithExactly(slotName, slotWillBe.removed)).to.be.true;
    });

    it('should return false when a slot is going to be rerendered and true when it is already rerendered or still active', async () => {
        router.getCurrentRoute.returns(routeThatHasProvidedSlot);
        router.getPrevRoute.returns(routeThatHasProvidedSlot);

        const prevRouteProps = {
            prevRouteProps: 'prevRouteProps',
        };
        const currentRouteProps = {
            currentRouteProps: 'currentRouteProps',
        };
        const sameRouteProps = {
            sameRouteProps: 'sameRouteProps',
        };

        router.getPrevRouteProps
            .onFirstCall().returns(prevRouteProps)
            .onSecondCall().returns(sameRouteProps);
        router.getCurrentRouteProps
            .onFirstCall().returns(currentRouteProps)
            .onSecondCall().returns(sameRouteProps);

        chai.expect(isActive()).to.be.false;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(triggerAppChange.calledOnce).to.be.true;
        chai.expect(handlePageTransaction.firstCall.calledWithExactly(slotName, slotWillBe.rerendered)).to.be.true;

        chai.expect(isActive()).to.be.true;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(triggerAppChange.calledOnce).to.be.true;
        chai.expect(handlePageTransaction.secondCall.calledWithExactly(slotName, slotWillBe.default)).to.be.true;

        chai.expect(isActive()).to.be.true;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(triggerAppChange.calledOnce).to.be.true;
        chai.expect(handlePageTransaction.calledThrice).to.be.true;
    });
});
