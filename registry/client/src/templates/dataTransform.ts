import type { RaRecord } from 'react-admin';

import type { SetOperation } from '../dataTransform';

/** A template as the Registry API returns it */
export interface NamedDto {
    name: string;
    [key: string]: unknown;
}

/** The name is the id */
export function transformGet(template: NamedDto): RaRecord {
    return { ...template, id: template.name };
}

export function transformSet(template: Partial<RaRecord>, operation?: SetOperation) {
    const data = { ...template };

    if (operation === 'update') {
        // The name identifies the record and cannot be changed
        delete data.name;
    }
    delete data.id;

    return data;
}
