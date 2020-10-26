function fireRoutingEvent() {
    window.dispatchEvent(new CustomEvent('ilc:before-routing'));
}

function patchedUpdateState(updateState) {
    return function (state, title, url, ...rest) {
        const urlBefore = window.location.href;
        const urlProcessor = require('../getIlcUrlProcessor')();
        const urlAfterProcessing = url ? urlProcessor.process(url) : url;
        const result = updateState.call(this, state, title, urlAfterProcessing, ...rest);
        const urlAfter = window.location.href;

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
