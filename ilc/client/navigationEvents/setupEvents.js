let hooks = [];
let currUrl = window.location.href;

const capturedEventListeners = {
    hashchange: [],
    popstate: [],
};

const routingEventsListeningTo = [
    'hashchange',
    'popstate'
];

const addEventListener = window.addEventListener;
const removeEventListener = window.removeEventListener;

function callCapturedEventListeners(eventArguments) {
    if (!eventArguments) {
        return;
    }

    const eventType = eventArguments[0].type;

    if (!routingEventsListeningTo.includes(eventType)) {
        return;
    }

    capturedEventListeners[eventType].forEach((listener) => {
        try {
            listener.apply(this, eventArguments);
        } catch (error) {
            setTimeout(() => {
                throw error;
            });
        }
    });
}

function patchedAddEventListener(eventName, fn) {
    if (
        typeof fn === 'function' &&
        routingEventsListeningTo.includes(eventName) &&
        !capturedEventListeners[eventName].includes(fn)
    ) {
        capturedEventListeners[eventName].push(fn);
        return;
    }

    return addEventListener.apply(this, arguments);
}

function patchedRemoveEventListener(eventName, fn) {
    if (typeof fn === 'function' && routingEventsListeningTo.includes(eventName)) {
        capturedEventListeners[eventName] = capturedEventListeners[eventName].filter((listener) => listener !== fn);
        return;
    }

    return removeEventListener.apply(this, arguments);
}

function fireRoutingEvent() {
    window.dispatchEvent(new CustomEvent('ilc:before-routing'));
}

export function addNavigationHook(fn) {
    if (typeof fn !== 'function') {
        throw new Error(`Provided hook "${fn}" is not a function! Please check that you provided a function while calling "addNavigationHook()".`);
    }

    if (hooks.includes(fn)) {
        console.warn(`Provided hook "${fn}" is already existed! Please provide only a unique hook to "addNavigationHook()".`);
        return;
    }

    hooks.push(fn);
}

export function removeNavigationHook(fn) {
    if (typeof fn === 'function' && hooks.includes(fn)) {
        hooks = hooks.filter((hook) => hook !== fn);
    }
}

function callNavigationHooks(url) {
    let state = {
        navigationShouldBeCanceled: false,
        nextUrl: url,
    };

    for (const hook of hooks) {
        const nextState = hook(state);

        if (typeof nextState === 'object') {
            state = Object.assign({}, state, nextState);
        }
    }

    return state;
}

function patchedUpdateState(updateState) {
    return function (state, title, url, ...rest) {
        const {
            navigationShouldBeCanceled,
            nextUrl,
        } = callNavigationHooks(url);

        if (navigationShouldBeCanceled) {
            return;
        }

        const oldUrl = window.location.href;
        const result = updateState.call(this, state, title, nextUrl, ...rest);
        const newUrl = window.location.href;

        if (oldUrl !== newUrl) {
            fireRoutingEvent();
        }

        return result;
    };
}

function handlePopState(event) {
    const prevUrl = currUrl;
    const nextUrl = (currUrl = window.location.href);

    if (!event.singleSpa && callNavigationHooks(nextUrl).navigationShouldBeCanceled) {
        window.history.replaceState(null, undefined, prevUrl);
        return;
    }

    callCapturedEventListeners(arguments);
}

addEventListener('hashchange', handlePopState);
addEventListener('popstate', handlePopState);

window.addEventListener = patchedAddEventListener;
window.removeEventListener = patchedRemoveEventListener;

// We will trigger an app change for any routing events
window.addEventListener('hashchange', fireRoutingEvent);
window.addEventListener('popstate', fireRoutingEvent);

window.history.pushState = patchedUpdateState(window.history.pushState);
window.history.replaceState = patchedUpdateState(window.history.replaceState);
