module.exports = class Application {
    static getConfig(reportPlugin) {
        const loggerKeys = ['logger'];
        const appConfig = {
            trustProxy: false, // TODO: should be configurable via Registry,
            disableRequestLogging: true,
        };

        const loggerConfig = Object.keys(reportPlugin).reduce((acc, key) => {
            if (loggerKeys.includes(key)) {
                if (!reportPlugin[key]) {
                    throw new Error(
                        `Can not initialize application config due to missing key '${key}' in reportPlugin`,
                    );
                }

                acc[key] = reportPlugin[key];
            }

            return acc;
        }, {});

        return {
            ...appConfig,
            ...loggerConfig,
        };
    }
};
