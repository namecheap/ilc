/*
 * SystemJS module info extension
 */
(function () {
    const systemJSPrototype = System.constructor.prototype;
    const resourcesMap = {};

    const existingResolve = systemJSPrototype.resolve;
    systemJSPrototype.resolve = function (moduleId, parentUrl) {
        const existingHookResult = existingResolve.call(this, moduleId, parentUrl);
        if (moduleId === existingHookResult) {
            //unnamed module
            return existingHookResult;
        }

        if (resourcesMap[moduleId] === undefined) {
            resourcesMap[moduleId] = {
                name: moduleId,
                src: existingHookResult,
                dependants: [],
            };
        }

        if (parentUrl !== undefined && !resourcesMap[moduleId].dependants.includes(parentUrl)) {
            resourcesMap[moduleId].dependants.push(parentUrl);
        }

        // custom hook here
        return existingHookResult;
    };

    systemJSPrototype.getModuleInfo = function (moduleId) {
        if (resourcesMap[moduleId] !== undefined) {
            return resourcesMap[moduleId];
        }

        for (let ii in resourcesMap) {
            if (!resourcesMap.hasOwnProperty(ii)) {
                continue;
            }

            if (resourcesMap[ii].src === moduleId) {
                return resourcesMap[ii];
            }
        }

        return null;
    };
})();
