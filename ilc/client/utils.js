function getSlotNode(slotName) {
    const slot = document.getElementById(slotName);
    if (slot === null) {
        throw new Error(`Can't find slot element on the page`);
    }

    return slot;
}

export function getSlotElement(slotName) {
    const slot = getSlotNode(slotName);
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
    // the slot element itself: an app's server markup may hold an `.app-container`, which is the
    // app's mount point inside its own container, not the parent of the containers
    const slot = getSlotNode(slotName);
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

    // Moving a node resets scroll, focus and iframes inside it, so a container already in the slot
    // moves only when a neighbour that the route lists is on the wrong side of it. Hidden apps the
    // route does not list do not count.
    if (container.parentNode === slot && !isMisplaced(slot, container, position, orderedAppIds)) {
        return;
    }
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

function isMisplaced(slot, container, position, orderedAppIds) {
    if (position === -1) {
        return false;
    }

    const siblings = Array.from(slot.children);
    const index = siblings.indexOf(container);

    return siblings.some((node, nodeIndex) => {
        const siblingId = node !== container && node.getAttribute && node.getAttribute('data-ilc-app-id');
        const siblingPosition = siblingId ? orderedAppIds.indexOf(siblingId) : -1;

        if (siblingPosition === -1) {
            return false;
        }

        return nodeIndex < index ? siblingPosition > position : siblingPosition < position;
    });
}

/**
 * The element an app of an own-container slot mounts into: its `.app-container` when the app's
 * markup has one (as `getSlotElement` does for a whole slot), so server markup is hydrated in place.
 */
export function getAppElement(slotName, appId, orderedAppIds = []) {
    const container = getAppContainer(slotName, appId, orderedAppIds);

    return container.querySelector('.app-container') || container;
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
