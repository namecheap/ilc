import path from 'node:path';

module.exports = {
    port: 4001,
    keepAliveTimeout: 5 * 60,
    database: {
        client: 'sqlite3',
        connection: {
            database: 'registry_db',
            filename: path.resolve(__dirname, '../server/dbfiles/db.sqlite'),
        },
        useNullAsDefault: true,
        migrations: {
            directory: path.resolve(__dirname, '../server/migrations'),
            extension: 'ts',
        },
        seeds: {
            directory: path.resolve(__dirname, '../server/seeds'),
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
        requestLimit: '1mb',
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
