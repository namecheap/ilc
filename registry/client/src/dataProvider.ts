import simpleRestProvider from 'ra-data-simple-rest';
import { withLifecycleCallbacks, type DataProvider, type Identifier, type ResourceCallbacks } from 'react-admin';

import * as appRoutes from './appRoutes/dataTransform';
import * as apps from './apps/dataTransform';
import * as authEntities from './authEntities/dataTransform';
import type { ResourceTransform } from './dataTransform';
import { fetchJson } from './httpClient';
import * as routerDomains from './routerDomains/dataTransform';
import * as settings from './settings/dataTransform';
import * as sharedLibs from './sharedLibs/dataTransform';
import * as sharedProps from './sharedProps/dataTransform';
import * as templates from './templates/dataTransform';

const apiUrl = '/api/v1';

/** How each resource is converted between its API shape and the shape the forms and views work with */
const transforms: Record<string, ResourceTransform> = {
    app: apps,
    shared_props: sharedProps,
    template: templates,
    route: appRoutes,
    settings,
    auth_entities: authEntities,
    router_domains: routerDomains,
    shared_libs: sharedLibs,
};

function toLifecycleCallbacks([resource, { transformGet, transformSet }]: [
    string,
    ResourceTransform,
]): ResourceCallbacks {
    return {
        resource,
        afterRead: async (record) => transformGet(record),
        afterSave: async (record) => transformGet(record),
        beforeCreate: async (params) => ({ ...params, data: transformSet(params.data) }),
        beforeUpdate: async (params) => ({ ...params, data: transformSet(params.data, 'update') }),
    };
}

// It encodes record ids in URLs itself, so names like "@portal/navbar" need no extra care here
const restDataProvider = simpleRestProvider(apiUrl, fetchJson);

const registryDataProvider: DataProvider = {
    ...restDataProvider,
    // The API addresses a setting by its key, and takes the router domain of an override beside it
    async getOne(resource, params) {
        if (resource !== 'settings') {
            return restDataProvider.getOne(resource, params);
        }

        const { key, domainId } = settings.parseSettingId(String(params.id));
        const query = domainId ? `?${new URLSearchParams({ domainId })}` : '';
        const { json } = await fetchJson(`${apiUrl}/${resource}/${encodeURIComponent(key)}${query}`, {
            signal: params.signal,
        });
        return { data: json };
    },
    async update(resource, params) {
        if (resource !== 'settings') {
            return restDataProvider.update(resource, params);
        }

        // The domain goes in the body, see the settings dataTransform
        return restDataProvider.update(resource, { ...params, id: settings.parseSettingId(String(params.id)).key });
    },
    async deleteMany(resource, params) {
        // The API answers a deletion with an empty body, so the ids cannot be taken from the responses
        await restDataProvider.deleteMany(resource, params);
        return { data: params.ids };
    },
    /**
     * Puts an entity back to what it was before a change recorded in the history.
     */
    async revertVersion(versionId: Identifier): Promise<void> {
        await fetchJson(`${apiUrl}/versioning/${encodeURIComponent(versionId)}/revert`, { method: 'POST' });
    },
};

export const dataProvider = withLifecycleCallbacks(
    registryDataProvider,
    Object.entries(transforms).map(toLifecycleCallbacks),
);
