function fireRoutingEvent() {
    window.dispatchEvent(new CustomEvent('ilc:before-routing'));
}

function patchedUpdateState(updateState) {
    return function () {
        const urlBefore = window.ILC.window.location.href;
        const result = updateState.apply(this, arguments);
        const urlAfter = window.ILC.window.location.href;

        if (urlBefore !== urlAfter) {
            fireRoutingEvent();
        }

        return result;
    };
}

// We will trigger an app change for any routing events.
window.addEventListener('hashchange', fireRoutingEvent);
window.addEventListener('popstate', fireRoutingEvent);

window.history.pushState = patchedUpdateState(window.history.pushState);
window.history.replaceState = patchedUpdateState(window.history.replaceState);
