export function getSlotElement(slotName) {
    const slot = document.getElementById(slotName);
    if (slot === null) {
        throw new Error(`Can't find slot element on the page`);
    }
    const appContainer = slot.querySelector('.app-container');

    return appContainer || slot;
}

export function prependSpaCallbacks(spaCallbacks, newCallbacks) {
    const res = {
        bootstrap: spaCallbacks.bootstrap,
        mount: spaCallbacks.mount,
        update: spaCallbacks.update,
        unmount: spaCallbacks.unmount,
        unload: spaCallbacks.unload,
    };

    newCallbacks.forEach(({ type, callback }) => {
        let orig = spaCallbacks[type];
        if (Array.isArray(orig)) {
            res[type] = [callback].concat(orig);
        } else {
            res[type] = [callback, orig];
        }
    });

    return res;
}

export function flattenFnArray(appOrParcel, lifecycle) {
    let fns = appOrParcel[lifecycle] || [];
    fns = Array.isArray(fns) ? fns : [fns];
    if (fns.length === 0) {
        fns = [() => Promise.resolve()];
    }

    return function (props) {
        return fns.reduce((resultPromise, fn, index) => {
            return resultPromise.then(() => {
                const thisPromise = fn(props);
                return smellsLikeAPromise(thisPromise)
                    ? thisPromise
                    : Promise.reject(`The lifecycle function ${lifecycle} at array index ${index} did not return a promise`);
            });
        }, Promise.resolve());
    };
}

export function smellsLikeAPromise(promise) {
    return (
        promise &&
        typeof promise.then === "function" &&
        typeof promise.catch === "function"
    );
}

/**
 *
 * @param {boolean} condition
 * @param {string} message
 */
export function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}
