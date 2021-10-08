const deepmerge = require('deepmerge');
const _ = require('lodash');

module.exports = (original, override) => {
    if (!override || !override.apps && !override.routes && !override.sharedLibs) {
        return original;
    }

    const cloned = _.cloneDeep(original);

    if (override.apps) {
        cloned.apps = deepmerge(cloned.apps, override.apps);
    }

    if (override.routes) {
        override.routes.forEach(overrideRoute => {
            let indexOfOverrideRoute;
            const beforeOf = overrideRoute.beforeOf;

            const originalRoute = cloned.routes.find((route) => {
                if (overrideRoute.routeId) {
                    return route.routeId === overrideRoute.routeId;
                } else  {
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

            if (beforeOf) {
                const [routeThatShouldBeMoved] = cloned.routes.splice(indexOfOverrideRoute, 1);
                const beforeRouteIndex = cloned.routes.findIndex((route) => beforeOf === route.route || beforeOf === route.routeId);
                cloned.routes = [
                    ...cloned.routes.slice(0, beforeRouteIndex),
                    routeThatShouldBeMoved,
                    ...cloned.routes.slice(beforeRouteIndex)
                ];
            }
        });
    }

    if (override.sharedLibs) {
        for (let sharedLibName in override.sharedLibs) {
            const { spaBundle } = override.sharedLibs[sharedLibName]

            if (spaBundle) {
                cloned.sharedLibs[sharedLibName] = spaBundle;
            }
        }
    }

    return cloned;
};
