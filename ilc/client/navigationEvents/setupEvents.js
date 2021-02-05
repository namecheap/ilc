let hooks = [];
let errorHandler = null;
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
        console.warn(`ILC: Provided hook "${fn}" is already existed! Please provide only a unique hook to "addNavigationHook()".`);
        return;
    }

    hooks.push(fn);
}

export function removeNavigationHook(fn) {
    if (typeof fn === 'function' && hooks.includes(fn)) {
        hooks = hooks.filter((hook) => hook !== fn);
    }
}

export function setNavigationErrorHandler(fn) {
    if (typeof fn !== 'function') {
        throw new Error(`Provided error handler "${fn}" is not a function! Please check that you provided a function while calling "setErrorHandler()".`);
    }

    if (typeof errorHandler === 'function') {
        console.warn(`ILC: Navigation error handler has been set already! Please check that you set navigation error handler only once.`);
        return;
    }

    errorHandler = fn;
}

export function unsetNavigationErrorHandler() {
    errorHandler = null;
}

function callNavigationHooks(url) {
    // TODO: Update the following logic in the way of Express middleware (next(url | null))
    let state = {
        navigationShouldBeCanceled: false,
        nextUrl: url,
    };

    for (const hook of hooks) {
        const hookIndex = hooks.indexOf(hook);

        try {
            const nextState = hook(state);

            if (typeof nextState === 'object') {
                state = Object.assign({}, state, nextState);
            }
        } catch (error) {
            if (typeof errorHandler === 'function') {
                errorHandler(error, {
                    hookIndex,
                });
            } else {
                console.error(`ILC: The following error has occurred while executing the transition hook with index #${hookIndex}:`, error);
            }

            state.navigationShouldBeCanceled = true;
            return state;
        }
    }

    return state;
}

function patchedUpdateState(updateState) {
    return function (state, title, url, ...rest) {
        /**
         * Need to check "url" argument because dependencies as "@mapbox/scroll-restorer" provides "window.location" when using History API
         * This parameter should be a string or undefined due to the documentation
         *
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/History_API}
         * @see {@link https://github.com/mapbox/scroll-restorer/blob/main/index.js#L65}
         */
        if (typeof url === 'object' && url.pathname) {
            url = url.pathname + url.search + url.hash;
        }

        if (url) {
            const hooksRes = callNavigationHooks(url);

            if (hooksRes.navigationShouldBeCanceled) {
                return;
            }

            url = hooksRes.nextUrl;
        }

        const oldUrl = window.location.href;
        const result = updateState.call(this, state, title, url, ...rest);
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
        window.history.replaceState(window.history.state, undefined, prevUrl);
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
