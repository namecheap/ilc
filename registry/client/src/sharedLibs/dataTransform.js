export function transformGet(sharedLib) {
    sharedLib.id = sharedLib.name;
}

export function transformSet(sharedLib) {
    if (sharedLib.assetsDiscoveryUrl) {
        delete sharedLib.spaBundle;
    }
    delete sharedLib.id;
    delete sharedLib.assetsDiscoveryUpdatedAt;
}
