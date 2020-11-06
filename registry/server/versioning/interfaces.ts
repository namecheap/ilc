
export enum EntityTypes {
    apps = 'apps',
    routes = 'routes',
}

export interface OperationConf {
    type: EntityTypes | keyof typeof EntityTypes;
    id?: string|number;
}

export interface VersionRowData {
    entity_type: string;
    entity_id: string;
    data: string|null;
    data_after: string|null;
    created_by: string;
    created_at: number;
}
export interface VersionRow extends VersionRowData {
    id: string;
}

export interface VersionRowParsed extends VersionRow {
    data: any|null;
    data_after: any|null;
}
