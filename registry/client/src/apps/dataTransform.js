export function transformGet(app) {
    app.id = app.name;
    if (app.dependencies) {
        app.dependencies = Object.keys(app.dependencies).map(key => ({
            key,
            value: app.dependencies[key]
        }));
    }
    if (app.props) {
        app.props = JSON.stringify(app.props);
    }
    if (app.ssrProps) {
        app.ssrProps = JSON.stringify(app.ssrProps);
    }
}

export function transformSet(app) {
    if (app.props && typeof data.props === 'string') {
        app.props = JSON.parse(app.props);
    }
    if (app.ssrProps && typeof data.ssrProps === 'string') {
        app.ssrProps = JSON.parse(app.ssrProps);
    }
    if (app.dependencies) {
        app.dependencies = app.dependencies.reduce((acc, v) => {
            acc[v.key] = v.value;
            return acc;
        }, {})
    }
    if (app.assetsDiscoveryUrl) {
        delete app.spaBundle;
    }
    delete app.id;
    delete app.assetsDiscoveryUpdatedAt;
}
