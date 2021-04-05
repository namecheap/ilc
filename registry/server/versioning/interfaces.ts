
export enum EntityTypes {
    apps = 'apps',
    routes = 'routes',
    auth_entities = 'auth_entities',
    settings = 'settings',
    shared_props = 'shared_props',
    templates = 'templates',
    router_domains = 'router_domains',
}

export interface OperationConf {
    type: EntityTypes | keyof typeof EntityTypes;
    id?: string|number;
}

interface VersionRowBase {
    entity_type: string;
    entity_id: string;
    created_by: string;
    created_at: string;
}

export interface VersionRowData extends VersionRowBase {
    data: string|null;
    data_after: string|null;
}
export interface VersionRow extends VersionRowData {
    id: string;
}

export interface VersionRowParsed extends VersionRowBase {
    id: string;
    data: {data: object, related: Record<string, object[]>}|null;
    data_after: {data: object, related: Record<string, object[]>}|null;
}
