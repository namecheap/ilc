const AssetsDiscoveryWhiteLists = Object.freeze({
    shared_libs: ['spaBundle'],
    apps: ['spaBundle', 'cssBundle', 'dependencies'],
} as const);

export default AssetsDiscoveryWhiteLists;
