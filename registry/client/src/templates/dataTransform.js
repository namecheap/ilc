export function transformGet(data) {
    data.id = data.name;
}

export function transformSet(data) {
    delete data.id;
}
