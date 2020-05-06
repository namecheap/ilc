import chai from 'chai';
import sinon from 'sinon';
import isActiveFactory from './isActiveFactory';

describe('is active factory', () => {
    const dispatchSingleSpaAppChangeEvent = () => window.dispatchEvent(new Event('single-spa:app-change'));

    const singleSpa = {
        triggerAppChange: sinon.spy(),
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

    const slotWillBe = {
        rendered: 'rendered',
        removed: 'removed',
        rerendered: 'rerendered',
        default: null,
    };
    const handlePageTransaction = sinon.spy();

    const setIlcConfig = () => {
        window.ilcConfig = {
            tmplSpinner: '<div id="spinner" class="ilc-spinner">Hello! I am Spinner</div>',
        };
    };
    const removeIlcConfig = () => {
        delete window.ilcConfig;
    };

    let isActive;
    let clock;

    beforeEach(() => {
        isActive = isActiveFactory({
            singleSpa,
            router,
            handlePageTransaction,
            slotWillBe,
            appName,
            slotName,
        });

        setIlcConfig();

        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        router.getPrevRouteProps.reset();
        router.getCurrentRouteProps.reset();
        router.getCurrentRoute.reset();
        router.getPrevRoute.reset();

        handlePageTransaction.resetHistory();
        singleSpa.triggerAppChange.resetHistory();

        removeIlcConfig();

        clock.restore();
    });

    it('should return true when a slot is going to be rendered', async () => {
        router.getCurrentRoute.onFirstCall().returns(routeThatHasProvidedSlot);
        router.getPrevRoute.onFirstCall().returns(routeThatDoesNotHaveProvidedSlot);

        chai.expect(isActive()).to.be.true;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(singleSpa.triggerAppChange.called).to.be.false;
        chai.expect(handlePageTransaction.calledOnceWithExactly(slotName, slotWillBe.rendered)).to.be.true;
        chai.expect(router.getPrevRouteProps.called).to.be.false;
        chai.expect(router.getCurrentRouteProps.called).to.be.false;
    });

    it('should return false when a slot is going to be removed', async () => {
        router.getCurrentRoute.onFirstCall().returns(routeThatDoesNotHaveProvidedSlot);
        router.getPrevRoute.onFirstCall().returns(routeThatHasProvidedSlot);

        chai.expect(isActive()).to.be.false;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(singleSpa.triggerAppChange.called).to.be.false;
        chai.expect(handlePageTransaction.calledOnceWithExactly(slotName, slotWillBe.removed)).to.be.true;
        chai.expect(router.getPrevRouteProps.called).to.be.false;
        chai.expect(router.getCurrentRouteProps.called).to.be.false;
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

        chai.expect(singleSpa.triggerAppChange.calledOnce).to.be.true;
        chai.expect(handlePageTransaction.firstCall.calledWithExactly(slotName, slotWillBe.rerendered)).to.be.true;

        chai.expect(isActive()).to.be.true;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(singleSpa.triggerAppChange.calledOnce).to.be.true;
        chai.expect(handlePageTransaction.secondCall.calledWithExactly(slotName, slotWillBe.default)).to.be.true;

        removeIlcConfig();

        chai.expect(isActive()).to.be.true;

        dispatchSingleSpaAppChangeEvent();

        await clock.runAllAsync();

        chai.expect(singleSpa.triggerAppChange.calledOnce).to.be.true;
        chai.expect(handlePageTransaction.calledTwice).to.be.true;
    });
});
