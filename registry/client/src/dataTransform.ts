import type { RaRecord } from 'react-admin';

export type SetOperation = 'create' | 'update';

/**
 * How a resource is converted between its API shape and the shape the forms and views work with.
 * Every resource folder has a dataTransform module of this shape.
 */
export interface ResourceTransform {
    // The API returns untyped JSON, each module declares the shape it expects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformGet(data: any): RaRecord;
    transformSet(data: Partial<RaRecord>, operation?: SetOperation): object;
}
