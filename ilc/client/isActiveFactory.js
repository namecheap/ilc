import {triggerAppChange} from './navigationEvents';
import transactionManager, {slotWillBe} from './TransactionManager/TransactionManager';

export const createFactory = (logger, triggerAppChange, handlePageTransaction, slotWillBe) => (router, appName, slotName) => {
    let reload = false;

    return () => {
        const checkActivity = (route) => Object.entries(route.slots).some(([
            currentSlotName,
            slot
        ]) => slot.appName === appName && currentSlotName === slotName);

        let isActive = checkActivity(router.getCurrentRoute());
        const wasActive = checkActivity(router.getPrevRoute());

        let willBe = slotWillBe.default;
        !wasActive && isActive && (willBe = slotWillBe.rendered);
        wasActive && !isActive && (willBe = slotWillBe.removed);

        if (isActive && wasActive && reload === false) {
            const oldProps = router.getPrevRouteProps(appName, slotName);
            const currProps = router.getCurrentRouteProps(appName, slotName);

            if (JSON.stringify(oldProps) !== JSON.stringify(currProps)) {
                window.addEventListener('single-spa:app-change', function singleSpaAppChange() {
                    window.removeEventListener('single-spa:app-change', singleSpaAppChange);
                    //TODO: need to consider addition of the new update() hook to the adapter. So it will be called instead of re-mount, if available.
                    logger.log(`ILC: Triggering app re-mount for ${appName} due to changed props.`);

                    reload = true;

                    triggerAppChange();
                });

                isActive = false;
                willBe = slotWillBe.rerendered;
            }
        }

        handlePageTransaction(slotName, willBe);
        reload = false;

        return isActive;
    };
};

let defaultInstance = null;
export default function (...args) {
    if (defaultInstance === null) {
        const tm = transactionManager();
        defaultInstance = createFactory(window.console, triggerAppChange, tm.handlePageTransaction.bind(tm), slotWillBe);
    }

    return defaultInstance(...args);
};
