/*
 * SystemJS module info extension
 */
(function () {
    const systemJSPrototype = System.constructor.prototype;
    const resourcesMap = {};

    const existingResolve = systemJSPrototype.resolve;
    systemJSPrototype.resolve = function (id, parentUrl) {
        if (resourcesMap[id]) {
            return resourcesMap[id];
        }

        return existingResolve.call(this, id, parentUrl);
    };

    systemJSPrototype.overrideImportMap = function (id, url) {
        try {
            existingResolve.call(this, id);
        } catch (e) { // We override only dependencies that weren't declared previously
            resourcesMap[id] = url;
        }
    }
})();
