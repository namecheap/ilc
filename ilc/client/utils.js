export function getSlotElement(slotName) {
    const slot = document.getElementById(slotName);
    if (slot === null) {
        throw new Error(`Can't find slot element on the page`);
    }
    const appContainer = slot.querySelector('.app-container');

    return appContainer || slot;
}

/**
 * The container of one app inside a slot that renders several apps. Server-rendered fragments of
 * such a slot arrive wrapped in this element already (fragment hooks); a client-rendered app gets
 * it created on first use. `orderedAppIds` is the order the current route lists the apps of the
 * slot in; the container is placed accordingly, so client-mounted apps keep the list order even when
 * they mount in another order.
 *
 * @param {string} slotName
 * @param {string} appId
 * @param {string[]} [orderedAppIds]
 * @returns {HTMLElement}
 */
export function getAppContainer(slotName, appId, orderedAppIds = []) {
    const slot = getSlotElement(slotName);
    const existing = Array.from(slot.children).find(
        (node) => node.getAttribute && node.getAttribute('data-ilc-app-id') === appId,
    );

    if (existing) {
        return existing;
    }

    const container = document.createElement('div');
    container.setAttribute('data-ilc-app-id', appId);

    placeAppContainer(slot, container, orderedAppIds);

    return container;
}

/**
 * Puts a container before the first sibling container that comes later in `orderedAppIds`; at the
 * end when no such sibling exists or the order is unknown.
 */
export function placeAppContainer(slot, container, orderedAppIds = []) {
    const appId = container.getAttribute('data-ilc-app-id');
    const position = orderedAppIds.indexOf(appId);
    const nextSibling =
        position === -1
            ? null
            : Array.from(slot.children).find((node) => {
                  const siblingId = node.getAttribute && node.getAttribute('data-ilc-app-id');
                  const siblingPosition = siblingId === null ? -1 : orderedAppIds.indexOf(siblingId);

                  return siblingId !== appId && siblingPosition > position;
              }) || null;

    if (nextSibling) {
        slot.insertBefore(container, nextSibling);
    } else if (container.parentNode !== slot || container.nextSibling !== null) {
        slot.appendChild(container);
    }
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
                    : Promise.reject(
                          `The lifecycle function ${lifecycle} at array index ${index} did not return a promise`,
                      );
            });
        }, Promise.resolve());
    };
}

export function smellsLikeAPromise(promise) {
    return promise && typeof promise.then === 'function' && typeof promise.catch === 'function';
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
