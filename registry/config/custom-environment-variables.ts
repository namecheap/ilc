module.exports = {
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
        },
        defaultSecret: 'DEFAULT_SECRET',
    },
    auth: {
        sessionSecret: 'AUTH_SESSION_SECRET',
    }
};
