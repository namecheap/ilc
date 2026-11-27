import type { RaRecord } from 'react-admin';

import type { SetOperation } from '../dataTransform';

export function transformGet(entity: RaRecord): RaRecord {
    return entity;
}

export function transformSet(entity: Partial<RaRecord>, operation?: SetOperation) {
    const data = { ...entity };

    if (operation === 'update') {
        delete data.id;
        delete data.identifier;
        delete data.provider;
    }

    return data;
}
