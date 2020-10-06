import { getSlotElement } from './utils';
import getIlcConfig from './ilcConfig';

import scrollRestorer from '@mapbox/scroll-restorer';
scrollRestorer.start({ autoRestore: false, captureScrollDebounce: 150 });

let globalSpinner, spinnerTimeout;
const runGlobalSpinner = () => {
    const registrySettings = getIlcConfig().settings;
    if (registrySettings.globalSpinner === false || spinnerTimeout) return;

    spinnerTimeout = setTimeout(() => {
        if (registrySettings.globalSpinner === true) {
            globalSpinner = document.createElement('dialog');
            globalSpinner.innerHTML = 'loading....';
            document.body.appendChild(globalSpinner);
            globalSpinner.showModal();
        } else {
            globalSpinner = document.createElement('div');
            globalSpinner.innerHTML = registrySettings.globalSpinner;
            document.body.appendChild(globalSpinner);
        }
    }, 200);
};
const removeGlobalSpinner = () => {
    if (globalSpinner) {
        globalSpinner.remove();
        globalSpinner = null;
    }

    clearTimeout(spinnerTimeout);
    spinnerTimeout = null;
};

const fakeSlots = [];
const hiddenSlots = [];
const transactionBlockers = [];

function removeTransactionBlocker(blocker) {
    transactionBlockers.splice(transactionBlockers.indexOf(blocker), 1);
    !transactionBlockers.length && onAllSlotsLoaded();
}

window.addEventListener('ilc:crash', () => {
    removeGlobalSpinner();
});

const onAllSlotsLoaded = () => {
    fakeSlots.forEach(node => node.remove());
    fakeSlots.length = 0;
    hiddenSlots.forEach(node => node.style.display = '');
    hiddenSlots.length = 0;
    removeGlobalSpinner();
    document.body.removeAttribute('name');
    scrollRestorer.restoreScroll(window.history.state ? window.history : {state: {scroll: {x: 0, y: 0}}});

    window.dispatchEvent(new CustomEvent('ilc:all-slots-loaded'));
};

const addContentListener = slotName => {
    runGlobalSpinner();

    if (window.location.hash) {
        document.body.setAttribute('name', window.location.hash.slice(1));
    }

    const observer = new MutationObserver((mutationsList, observer) => {
        const hasAddedNodes = !!mutationsList.find(mutation => mutation.addedNodes.length);
        if (!hasAddedNodes) return;

        const hasText = !!targetNode.innerText.trim().length
        const hasOpticNodes = !!targetNode.querySelector(':not(div):not(span)');
        if (!hasText && !hasOpticNodes) return;

        observer.disconnect();
        removeTransactionBlocker(observer);
    });
    transactionBlockers.push(observer);
    const targetNode = getSlotElement(slotName);
    targetNode.style.display = 'none'; // we will show all new slots, only when all will be settled
    hiddenSlots.push(targetNode);
    observer.observe(targetNode, { childList: true, subtree: true });
};

const renderFakeSlot = slotName => {
    const targetNode = getSlotElement(slotName);
    const clonedNode = targetNode.cloneNode(true);
    clonedNode.removeAttribute('id');
    clonedNode.removeAttribute('class');
    fakeSlots.push(clonedNode);
    targetNode.parentNode.insertBefore(clonedNode, targetNode.nextSibling);
    targetNode.style.display = 'none'; // we hide old slot because fake already in the DOM.
    hiddenSlots.push(targetNode);
};

export const slotWillBe = {
    rendered: 'rendered',
    removed: 'removed',
    rerendered: 'rerendered',
    default: null,
};

export function handleAsyncAction(promise) {
    if (getIlcConfig().settings.globalSpinner === false) {
        return;
    }

    runGlobalSpinner();
    transactionBlockers.push(promise);

    const afterPromise = () => removeTransactionBlocker(promise);
    promise.then(afterPromise).catch(afterPromise)
}

export default function handlePageTransaction(slotName, willBe) {
    if (getIlcConfig().settings.globalSpinner === false) {
        return;
    }

    if (!slotName) {
        throw new Error('A slot name was not provided!');
    }

    switch (willBe) {
        case slotWillBe.rendered:
            addContentListener(slotName);
            break;
        case slotWillBe.removed:
            renderFakeSlot(slotName);
            break;
        case slotWillBe.rerendered:
            renderFakeSlot(slotName);
            addContentListener(slotName);
            break;
        case slotWillBe.default:
            break;
        default:
            throw new Error(`The slot action '${willBe}' did not match any possible values!`);
    }
}
