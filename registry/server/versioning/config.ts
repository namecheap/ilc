
interface RelatedEntities {
    type: string;
    idColumn: string;
    key: string;
}

interface EntityConf {
    idColumn: string;
    related: RelatedEntities[],
}

const versioningConf: Record<string, EntityConf> = {
    apps: {
        idColumn: 'name',
        related: [],
    },
    routes: {
        idColumn: 'id',
        related: [{ type: 'route_slots', idColumn: 'id', key: 'routeId' }],
    },
    auth_entities: {
        idColumn: 'id',
        related: [],
    },
};

export default versioningConf;
