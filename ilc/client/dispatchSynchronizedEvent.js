/**
 * Allows to dispatch an event reaction on which can be synchronized between all listening parties.
 * Can be used to perform some change of the UI simultaneously across all concerned parties even if it requires
 * some resources to be loaded over the network.
 *
 * @param {string} eventName
 * @param {Object} eventDetail
 * @param {Function} errorHandler
 * @return {Promise<void>} - resolves when all parties finished event handling
 */
export default function (eventName, eventDetail, errorHandler) {
    const handlers = [];
    const detail = Object.assign(eventDetail, {
        addHandler: (v) => handlers.push(v),
    });

    //Here "parties" array will be filled with listeners
    window.dispatchEvent(new CustomEvent(eventName, { detail }));

    handlers.forEach((v) => {
        v.errorHandler = (...args) => errorHandler(v.actorId, ...args);
        v.prepare = wrapWithPromise(v.prepare);
        v.execute = wrapWithPromise(v.execute);
    });

    const preparationPromises = handlers.map((v) => v.prepare(eventDetail));

    return Promise.allSettled(preparationPromises)
        .then((results) => {
            for (let ii = 0; ii < results.length; ii++) {
                const row = results[ii];

                if (row.status === 'rejected') {
                    handlers[ii].errorHandler(row.reason);
                    handlers.splice(ii, 1);
                    results.splice(ii, 1);
                    ii--;
                }
            }

            const executionPromises = handlers.map((v, i) => v.execute(eventDetail, results[i].value));

            return Promise.allSettled(executionPromises);
        })
        .then((results) => {
            results
                .map((v, i) => {
                    v.errorHandler = handlers[i].errorHandler;
                    return v;
                })
                .filter((v) => v.status === 'rejected')
                .forEach((v) => v.errorHandler(v.reason));
        });
}

function wrapWithPromise(callback) {
    return (...args) =>
        new Promise((resolve, reject) => {
            try {
                resolve(callback.apply(null, args));
            } catch (err) {
                reject(err);
            }
        });
}
