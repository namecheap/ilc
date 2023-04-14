module.exports = {
    port: 'ILC_REGISTRY_PORT',
    newrelic: {
        licenseKey: 'NR_LICENSE_KEY',
    },
    database: {
        client: 'DB_CLIENT',
        connection: {
            host: 'DB_HOST',
            user: 'DB_USER',
            password: 'DB_PASSWORD',
            database: 'DB_NAME',
            filename: 'DB_FILENAME',
        },
        rootPassword: 'ROOT_PWD',
    },
    auth: {
        sessionSecret: 'AUTH_SESSION_SECRET',
    },
    healthCheck: {
        url: 'ILC_REGISTRY_HEALTH_CHECK_URL',
    },
};
