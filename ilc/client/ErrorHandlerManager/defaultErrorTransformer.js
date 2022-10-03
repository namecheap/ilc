export default ({ config, error, errorInfo }) => {
    const { apps = {}, sharedLibs = {}} = config;
    const { name, dependants, src, type, errorId, ...rest } = errorInfo;

    const processedInfo = { type, errorId };

    const bundleSharedLibs = Object.keys(sharedLibs)
        .reduce((result, libName) => {
            const libraryBundle = sharedLibs[libName];
            result[libraryBundle] = libName;

            return result;
        }, {});

    const bundleApps = Object.keys(apps)
        .reduce((result, appName) => {
            const appConfig = apps[appName];
            result[appConfig.spaBundle] = appName;

            return result;
        }, {});

    if (dependants) {
        processedInfo.dependants = dependants.map((dependant) => bundleApps[dependant] || bundleSharedLibs[dependant] || dependant);
    }

    if (src && bundleApps[src]) {
        processedInfo.appName = bundleApps[src];
    } else if (name && apps[name]) {
        processedInfo.appName = name;
    } else if (name) {
        processedInfo.name = name;
    }

    return {
        errorInfo: {
            ...rest,
            ...processedInfo
        },
        error,
    };
}
