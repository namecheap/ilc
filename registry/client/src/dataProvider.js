
import simpleRestProvider from 'ra-data-simple-rest';

const dataProvider = simpleRestProvider('/api/v1');

const myDataProvider = {
    ...dataProvider,
    getList: (resource, params) => {

        return dataProvider.getList(resource, params).then(v => {
            v.data.forEach(v => transformAppGetter(resource, v))
            return v;
        });
    },
    getOne: (resource, params) => {
        params.id = encodeURIComponent(params.id);

        return dataProvider.getOne(resource, params).then(v => {
            transformAppGetter(resource, v.data);
            return v;
        });
    },
    update: (resource, params) => {
        params.id = encodeURIComponent(params.id);

        transformAppSetter(resource, params.data);
        delete params.data.name;

        return dataProvider.update(resource, params).then(v => {
            transformAppGetter(resource, v.data);
            return v;
        });
    },
    create: (resource, params) => {
        transformAppSetter(resource, params.data);

        return dataProvider.create(resource, params).then(v => {
            transformAppGetter(resource, v.data);
            return v;
        });
    },
    delete: (resource, params) => {
        params.id = encodeURIComponent(params.id);

        return dataProvider.delete(resource, params);
    },
    deleteMany: (resource, params) => {
        params.ids = params.ids.map(v => encodeURIComponent(v));

        return Promise.all(
            params.ids.map(id =>
                dataProvider.delete(resource, { id }, {
                    method: 'DELETE',
                })
            )
        ).then(() => ({data: params.ids}));
    },
};

function transformAppGetter(resource, app) {
    if (resource !== 'app') {
        return;
    }

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

function transformAppSetter(resource, app) {
    if (resource !== 'app') {
        return;
    }

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
    delete app.id;
    delete app.assetsDiscoveryUpdatedAt;
}


export default myDataProvider;
