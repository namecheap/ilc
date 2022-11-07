const AssetsDiscoveryWhiteLists: Record<'shared_libs' | 'apps', string[]> = {
    shared_libs: ['spaBundle'],
    apps: ['spaBundle', 'cssBundle', 'dependencies'],
};

export default AssetsDiscoveryWhiteLists;
