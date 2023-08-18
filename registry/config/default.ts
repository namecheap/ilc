module.exports = {
    port: 4001,
    keepAliveTimeout: 5 * 60,
    database: {
        client: 'sqlite3',
        connection: {
            database: 'registry_db',
            filename: './server/dbfiles/db.sqlite',
        },
        useNullAsDefault: true,
        migrations: {
            directory: './server/migrations',
            extension: 'ts',
        },
        seeds: {
            directory: './server/seeds',
        },
        rootPassword: null,
    },
    newrelic: {
        licenseKey: null,
    },
    auth: {
        sessionSecret: 'zaM7%#BjyZZ3A5zV@Mpt',
    },
    http: {
        requestLimit: '200kb',
    },
    healthCheck: {
        url: '/ping',
    },
    infra: {
        settings: {
            baseUrl: null,
        },
    },
};
