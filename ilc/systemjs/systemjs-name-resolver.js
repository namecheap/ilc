/*
 * SystemJS module info extension
 */
(function () {
    const systemJSPrototype = System.constructor.prototype;
    const resourcesMap = {};

    const existingResolve = systemJSPrototype.resolve;
    systemJSPrototype.resolve = function (id, parentUrl) {
        return Promise.resolve(existingResolve.call(this, id, parentUrl))
            .then(function (existingHookResult) {
                if (id === existingHookResult) { //unnamed module
                    return existingHookResult;
                }

                if (resourcesMap[id] === undefined) {
                    resourcesMap[id] = {
                        name: id,
                        src: existingHookResult,
                        dependants: []
                    }
                }

                if (parentUrl !== undefined && !resourcesMap[id].dependants.includes(parentUrl)) {
                    resourcesMap[id].dependants.push(parentUrl);
                }

                // custom hook here
                return existingHookResult;
            });
    };

    systemJSPrototype.getModuleInfo = function (id) {
        if (resourcesMap[id] !== undefined) {
            return resourcesMap[id];
        }

        for (let ii in resourcesMap) {
            if (!resourcesMap.hasOwnProperty(ii)) {
                continue;
            }

            if (resourcesMap[ii].src === id) {
                return resourcesMap[ii];
            }
        }

        return null;
    }
})();