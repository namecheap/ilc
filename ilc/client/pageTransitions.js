let globalSpinner;
const runGlobalSpinner = () => {
    const tmplSpinner = window.ilcConfig && window.ilcConfig.tmplSpinner;
    if (!tmplSpinner) return;

    setTimeout(() => {
        if (globalSpinner || !contentListeners.length) return;

        globalSpinner = document.createElement('div');
        globalSpinner.innerHTML = tmplSpinner;
        document.body.appendChild(globalSpinner);
    }, 200);
};
const removeGlobalSpinner = () => {
    if (!globalSpinner) return;

    globalSpinner.remove();
    globalSpinner = null;
};

const fakeSlots = [];
const hiddenSlots = [];
const contentListeners = [];

const onAllSlotsLoaded = () => {
    removeGlobalSpinner();
    window.scrollTo(0, 0);
    fakeSlots.forEach(node => node.remove());
    fakeSlots.length = 0;
    hiddenSlots.forEach(node => node.style.display = '');
    hiddenSlots.length = 0;
};

export const addContentListener = slotName => {
    runGlobalSpinner();

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
    targetNode.style.display = 'none';
    hiddenSlots.push(targetNode);
    observer.observe(targetNode, { childList: true });
};

export const renderFakeSlot = nodeId => {
    const targetNode = document.getElementById(nodeId);
    const clonedNode = targetNode.cloneNode(true);
    clonedNode.removeAttribute('id');
    fakeSlots.push(clonedNode);
    targetNode.parentNode.insertBefore(clonedNode, targetNode.nextSibling);
};
