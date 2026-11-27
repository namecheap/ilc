import type { RaRecord } from 'react-admin';

interface SlotDto {
    appName: string;
    kind?: string | null;
    props?: object;
}

/** A route as the Registry API returns it */
export interface AppRouteDto {
    id: number;
    slots?: Record<string, SlotDto>;
    [key: string]: unknown;
}

export interface SlotRecord extends SlotDto {
    key: string;
}

/** The form edits slots as a list */
export function transformGet(route: AppRouteDto): RaRecord {
    const record: RaRecord = { ...route };

    if (route.slots) {
        record.slots = Object.entries(route.slots).map(([key, slot]): SlotRecord => ({
            ...slot,
            kind: slot.kind || null,
            key,
        }));
    }

    return record;
}

export function transformSet(route: Partial<RaRecord>) {
    const data = { ...route };
    delete data.id;

    if (data.slots) {
        data.slots = Object.fromEntries((data.slots as SlotRecord[]).map(({ key, ...slot }) => [key, slot]));
    }
    if (!data.meta) {
        delete data.meta;
    }

    return data;
}
