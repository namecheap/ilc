/*
 * SystemJS module info extension
 */
(function () {
    const systemJSPrototype = System.constructor.prototype;
    const resourcesMap = {};

    const existingResolve = systemJSPrototype.resolve;
    systemJSPrototype.resolve = function (id, parentUrl) {
        try {
            return existingResolve.call(this, id, parentUrl);
        } catch (e) { // We override only dependencies that weren't declared previously
            if (resourcesMap[id]) {
                return resourcesMap[id];
            }

            throw e;
        }
    };

    systemJSPrototype.overrideImportMap = function (id, url) {
        resourcesMap[id] = url;
    }
})();
