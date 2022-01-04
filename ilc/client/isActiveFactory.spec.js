import chai from 'chai';
import sinon from 'sinon';
import html from 'nanohtml';

import {slotWillBe} from './TransactionManager/TransactionManager';
// import {createFactory} from './isActiveFactory';

describe.skip('is active factory', () => {
    const dispatchSingleSpaAppChangeEvent = () => window.dispatchEvent(new Event('single-spa:app-change'));

    const triggerAppChange = sinon.spy();
    const handlePageTransaction = sinon.spy();

    const logger = {
        log: sinon.spy(),
        error: sinon.spy(),
    };

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

    const pageTemplate = html`
        <main>
            <!-- Region "${slotName}" START -->
            <div id="${slotName}"></div>
            <!-- Region "${slotName}" END -->
        </main>
    `;

    let isActive;
    let clock;

    beforeEach(() => {
        const isActiveFactory = createFactory(logger, triggerAppChange, handlePageTransaction, slotWillBe);
        isActive = isActiveFactory(router, appName, slotName);

        clock = sinon.useFakeTimers();

        document.body.appendChild(pageTemplate);
    });

    afterEach(() => {
        router.getPrevRouteProps.reset();
        router.getCurrentRouteProps.reset();
        router.getCurrentRoute.reset();
        router.getPrevRoute.reset();

        handlePageTransaction.resetHistory();
        triggerAppChange.resetHistory();
        logger.log.resetHistory();
        logger.error.resetHistory();

        clock.restore();
        document.body.removeChild(pageTemplate);
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
        sinon.assert.calledWithExactly(
            logger.log,
            `ILC: Triggering app re-mount for ${appName} due to changed props.`
        );

        chai.expect(isActive()).to.be.true;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(triggerAppChange.calledOnce).to.be.true;
        chai.expect(handlePageTransaction.secondCall.calledWithExactly(slotName, slotWillBe.default)).to.be.true;

        chai.expect(isActive()).to.be.true;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(triggerAppChange.calledOnce).to.be.true;
        chai.expect(handlePageTransaction.secondCall.calledWithExactly(slotName, slotWillBe.default)).to.be.true;
    });
});
