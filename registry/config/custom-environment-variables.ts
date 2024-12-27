export default {
    port: 'ILC_REGISTRY_PORT',
    keepAliveTimeout: 'ILC_REGISTRY_KEEP_ALIVE_TIMEOUT',
    newrelic: {
        licenseKey: 'NR_LICENSE_KEY',
    },
    database: {
        client: 'DB_CLIENT',
        // connection: 'DB_URI',
        connection: {
            host: 'DB_HOST',
            user: 'DB_USER',
            password: 'DB_PASSWORD',
            database: 'DB_NAME',
            filename: 'DB_FILENAME',
        },
        searchPath: 'DB_SEARCH_PATH',
        rootPassword: 'ROOT_PWD',
    },
    auth: {
        sessionSecret: 'AUTH_SESSION_SECRET',
        cookieSecure: 'AUTH_COOKIE_SECURE',
    },
    healthCheck: {
        url: 'ILC_REGISTRY_HEALTH_CHECK_URL',
    },
    infra: {
        settings: {
            baseUrl: 'ILC_REGISTRY_BASE_URL',
        },
    },
};
