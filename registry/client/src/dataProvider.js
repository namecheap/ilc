
import simpleRestProvider from 'ra-data-simple-rest';

const dataProvider = simpleRestProvider('/api/v1');

const myDataProvider = {
    ...dataProvider,
    getList: (resource, params) => {

        return dataProvider.getList(resource, params).then(v => {
            if (resource === 'app') {
                v.data.forEach(v => transformAppGetter(v))
            }
            return v;
        });
    },
    getOne: (resource, params) => {
        params.id = encodeURIComponent(params.id);

        return dataProvider.getOne(resource, params).then(v => {
            if (resource === 'app') {
                transformAppGetter(v.data);
            }
            return v;
        });
    },
    update: (resource, params) => {
        params.id = encodeURIComponent(params.id);

        transformAppSetter(params.data);

        return dataProvider.update(resource, params);
    },
};

function transformAppGetter(app) {
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
    if (app.initProps) {
        app.initProps = JSON.stringify(app.initProps);
    }
}

function transformAppSetter(app) {
    if (app.props) {
        app.props = JSON.parse(app.props);
    }
    if (app.initProps) {
        app.initProps = JSON.parse(app.initProps);
    }
    if (app.dependencies) {
        app.dependencies = app.dependencies.reduce((acc, v) => {
            acc[v.key] = v.value;
            return acc;
        }, {})
    }
    delete app.name;
    delete app.id;
    delete app.assetsDiscoveryUpdatedAt;
}


export default myDataProvider;
