const deepmerge = require('deepmerge');

module.exports = (original, override) => {
    original.apps = deepmerge(original.apps, override.apps);

    override.routes && override.routes.forEach(overrideRoute => {
        const originalRoute = original.routes.find(n => n.routeId === overrideRoute.routeId);
        if (originalRoute) {
            const index = original.routes.indexOf(originalRoute);
            original.routes[index] = deepmerge(originalRoute, overrideRoute);
        } else {
            original.routes.push(overrideRoute);
        }
    })
};
