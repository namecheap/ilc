import {EntityTypes} from './interfaces';

interface RelatedEntities {
    type: string;
    idColumn: string;
    key: string;
}

interface EntityConf {
    idColumn: string;
    related: RelatedEntities[],
}

const versioningConf: Record<EntityTypes | keyof typeof EntityTypes, EntityConf> = {
    [EntityTypes.apps]: {
        idColumn: 'name',
        related: [],
    },
    [EntityTypes.routes]: {
        idColumn: 'id',
        related: [{ type: 'route_slots', idColumn: 'id', key: 'routeId' }],
    },
    [EntityTypes.auth_entities]: {
        idColumn: 'id',
        related: [],
    },
    [EntityTypes.settings]: {
        idColumn: 'key',
        related: [],
    },
    [EntityTypes.shared_props]: {
        idColumn: 'name',
        related: [],
    },
    [EntityTypes.templates]: {
        idColumn: 'name',
        related: [],
    },
    [EntityTypes.router_domains]: {
        idColumn: 'id',
        related: [],
    },
};

export default versioningConf;
