import type { RaRecord } from 'react-admin';

import type { SetOperation } from '../dataTransform';

/** A props set as the Registry API returns it */
export interface NamedDto {
    name: string;
    [key: string]: unknown;
}

/** The name is the id */
export function transformGet(sharedProps: NamedDto): RaRecord {
    return { ...sharedProps, id: sharedProps.name };
}

export function transformSet(sharedProps: Partial<RaRecord>, operation?: SetOperation) {
    const data = { ...sharedProps };

    if (operation === 'update') {
        // The name identifies the record and cannot be changed
        delete data.name;
    }
    delete data.id;

    return data;
}
