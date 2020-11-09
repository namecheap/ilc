export function transformGet(entity) {

}

export function transformSet(entity, operation) {
    if (operation === 'update') {
        delete entity.id;
        delete entity.identifier;
        delete entity.provider;
    }
}
