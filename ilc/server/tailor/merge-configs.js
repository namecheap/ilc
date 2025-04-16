const deepmerge = require('deepmerge');
const _ = require('lodash');

module.exports = (original, override) => {
    if (!override || (!override.apps && !override.routes && !override.sharedLibs)) {
        return original;
    }

    const cloned = _.cloneDeep(original);

    if (override.apps) {
        cloned.apps = deepmerge(cloned.apps, override.apps);
    }

    if (override.routes) {
        override.routes.forEach((overrideRoute) => {
            let indexOfOverrideRoute;
            const originalRoute = cloned.routes.find((route) => {
                if (overrideRoute.routeId) {
                    return route.routeId === overrideRoute.routeId;
                } else {
                    return route.route === overrideRoute.route;
                }
            });

            if (originalRoute) {
                indexOfOverrideRoute = cloned.routes.indexOf(originalRoute);
                cloned.routes[indexOfOverrideRoute] = deepmerge(originalRoute, overrideRoute);
            } else {
                cloned.routes.push(overrideRoute);
                indexOfOverrideRoute = cloned.routes.length - 1;
            }
        });
        cloned.routes = cloned.routes.sort((a, b) => a.orderPos - b.orderPos);
    }

    if (override.sharedLibs) {
        Object.entries(override.sharedLibs).forEach(([sharedLibName, sharedLibConfig]) => {
            const { spaBundle } = sharedLibConfig;

            if (spaBundle) {
                cloned.sharedLibs[sharedLibName] = spaBundle;
            }
        });
    }

    return cloned;
};
