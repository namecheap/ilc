
import simpleRestProvider from 'ra-data-simple-rest';

import * as sharedProps from './sharedProps/dataTransform';
import * as apps from './apps/dataTransform';
import * as templates from './templates/dataTransform';
import * as appRoutes from './appRoutes/dataTransform';
import * as settings from './settings/dataTransform';
import * as authEntities from './authEntities/dataTransform';

import httpClient from './httpClient';

const dataProvider = simpleRestProvider('/api/v1', httpClient);

const myDataProvider = {
    ...dataProvider,
    getList: (resource, params) => {
        return dataProvider.getList(resource, params).then(v => {
            v.data.forEach(v => transformGetter(resource, v));
            return v;
        });
    },
    getMany: (resource, params) => {
        return dataProvider.getMany(resource, params).then(v => {
            v.data.forEach(v => transformGetter(resource, v));
            return v;
        });
    },
    getManyReference: (resource, params) => {
        return dataProvider.getManyReference(resource, params).then(v => {
            v.data.forEach(v => transformGetter(resource, v));
            return v;
        });
    },
    getOne: (resource, params) => {
        params.id = encodeURIComponent(params.id);

        return dataProvider.getOne(resource, params).then(v => {
            transformGetter(resource, v.data);
            return v;
        });
    },
    update: (resource, params) => {
        params.id = encodeURIComponent(params.id);

        transformSetter(resource, params.data, 'update');
        delete params.data.name;

        return dataProvider.update(resource, params).then(v => {
            transformGetter(resource, v.data);
            return v;
        });
    },
    create: (resource, params) => {
        transformSetter(resource, params.data);

        return dataProvider.create(resource, params).then(v => {
            transformGetter(resource, v.data, 'create');
            return v;
        });
    },
    delete: (resource, params) => {
        params.id = encodeURIComponent(params.id);

        return dataProvider.delete(resource, params)
            .then(() => ({data: {id: params.id}}));
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

function transformGetter(resource, data) {
    switch (resource) {
        case 'app':
            apps.transformGet(data);
            break;
        case 'shared_props':
            sharedProps.transformGet(data);
            break;
        case 'template':
            templates.transformGet(data);
            break;
        case 'route':
            appRoutes.transformGet(data);
            break;
        case 'settings':
            settings.transformGet(data);
            break;
        case 'auth_entities':
            authEntities.transformGet(data);
            break;
        default:
    }
}

function transformSetter(resource, data, operation) {
    switch (resource) {
        case 'app':
            apps.transformSet(data, operation);
            break;
        case 'shared_props':
            sharedProps.transformSet(data, operation);
            break;
        case 'template':
            templates.transformSet(data, operation);
            break;
        case 'route':
            appRoutes.transformSet(data, operation);
            break;
        case 'settings':
            settings.transformSet(data, operation);
            break;
        case 'auth_entities':
            authEntities.transformSet(data, operation);
            break;
        default:
    }
}

export default myDataProvider;
