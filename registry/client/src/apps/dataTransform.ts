import type { RaRecord } from 'react-admin';

import type { SetOperation } from '../dataTransform';

/** An app as the Registry API returns it */
export interface AppDto {
    name: string;
    dependencies?: Record<string, string>;
    [key: string]: unknown;
}

export interface AppDependency {
    key: string;
    value: string;
}

/** The name is the id of an app, and the form edits dependencies as a list */
export function transformGet(app: AppDto): RaRecord {
    const record: RaRecord = { ...app, id: app.name };

    if (app.dependencies) {
        record.dependencies = Object.entries(app.dependencies).map(([key, value]) => ({ key, value }));
    }

    return record;
}

export function transformSet(app: Partial<RaRecord>, operation?: SetOperation) {
    const data = { ...app };

    if (data.dependencies) {
        data.dependencies = Object.fromEntries(
            (data.dependencies as AppDependency[]).map(({ key, value }) => [key, value]),
        );
    }
    if (data.ssr) {
        // Inputs that were left empty hold null, and the API takes SSR without any value as "no SSR"
        data.ssr = Object.fromEntries(Object.entries(data.ssr).filter(([, value]) => value != null && value !== ''));
    }
    if (data.assetsDiscoveryUrl) {
        delete data.spaBundle;
    }
    if (operation === 'update') {
        // The name identifies the app and cannot be changed
        delete data.name;
    }
    delete data.id;
    delete data.assetsDiscoveryUpdatedAt;

    return data;
}
