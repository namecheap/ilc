const deepmerge = require('deepmerge');
const _ = require('lodash');

module.exports = (original, override) => {
    if (!override || !override.apps && !override.routes) {
        return original;
    }

    const cloned = _.cloneDeep(original);

    if (override.apps) {
        cloned.apps = deepmerge(cloned.apps, override.apps);
    }

    if (override.routes) {
        override.routes.forEach(overrideRoute => {
            const originalRoute = cloned.routes.find(route => route.routeId === overrideRoute.routeId);

            if (originalRoute) {
                const index = cloned.routes.indexOf(originalRoute);
                cloned.routes[index] = deepmerge(originalRoute, overrideRoute);
            } else {
                cloned.routes.push(overrideRoute);
            }
        });
    }

    return cloned;
};
