import type { RaRecord } from 'react-admin';

import type { SetOperation } from '../dataTransform';

/** A shared library as the Registry API returns it */
export interface NamedDto {
    name: string;
    [key: string]: unknown;
}

/** The name is the id */
export function transformGet(sharedLib: NamedDto): RaRecord {
    return { ...sharedLib, id: sharedLib.name };
}

export function transformSet(sharedLib: Partial<RaRecord>, operation?: SetOperation) {
    const data = { ...sharedLib };

    if (data.assetsDiscoveryUrl) {
        delete data.spaBundle;
    }
    delete data.assetsDiscoveryUpdatedAt;
    if (operation === 'update') {
        // The name identifies the record and cannot be changed
        delete data.name;
    }
    delete data.id;

    return data;
}
