let globalSpinner, spinnerTimeout;
const runGlobalSpinner = () => {
    const tmplSpinner = window.ilcConfig && window.ilcConfig.tmplSpinner;
    if (!tmplSpinner) return;

    spinnerTimeout = setTimeout(() => {
        globalSpinner = document.createElement('div');
        globalSpinner.innerHTML = tmplSpinner;
        document.body.appendChild(globalSpinner);
    }, 200);
};
const removeGlobalSpinner = () => {
    globalSpinner.remove();
    globalSpinner = null;
};

const clearGlobalSpinnerTimeout = () => {
    clearTimeout(spinnerTimeout);
    spinnerTimeout = null;
};

const fakeSlots = [];
const hiddenSlots = [];
const contentListeners = [];

const onAllSlotsLoaded = () => {
    window.scrollTo(0, 0);
    fakeSlots.forEach(node => node.remove());
    fakeSlots.length = 0;
    hiddenSlots.forEach(node => node.style.display = '');
    hiddenSlots.length = 0;
    globalSpinner && removeGlobalSpinner();
    spinnerTimeout && clearGlobalSpinnerTimeout();
};

export const addContentListener = slotName => {
    !spinnerTimeout && runGlobalSpinner();

    const observer = new MutationObserver((mutationsList, observer) => {
        for(let mutation of mutationsList) {
            if (mutation.addedNodes.length) {
                observer.disconnect();
                contentListeners.splice(contentListeners.indexOf(observer), 1);
                !contentListeners.length && onAllSlotsLoaded();
            }
        }
    });
    contentListeners.push(observer);
    const targetNode = document.getElementById(slotName);
    targetNode.style.display = 'none'; // we will show all new slots, only when all will be settled
    hiddenSlots.push(targetNode);
    observer.observe(targetNode, { childList: true });
};

export const renderFakeSlot = nodeId => {
    const targetNode = document.getElementById(nodeId);
    const clonedNode = targetNode.cloneNode(true);
    clonedNode.removeAttribute('id');
    fakeSlots.push(clonedNode);
    targetNode.parentNode.insertBefore(clonedNode, targetNode.nextSibling);
    targetNode.style.display = 'none'; // we hide old slot because fake already in the DOM.
    hiddenSlots.push(targetNode);
};
