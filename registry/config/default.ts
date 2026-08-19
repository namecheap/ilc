import path from 'node:path';

module.exports = {
    port: 4001,
    keepAliveTimeout: 5 * 60,
    database: {
        client: 'sqlite3',
        connection: {
            database: 'registry_db',
            // Anchored to the registry root so that the source and the pre-compiled
            // (build/config) versions of this config point to the same database file
            filename: path.join(path.resolve(__dirname, '..').replace(/[\\/]build$/, ''), 'server/dbfiles/db.sqlite'),
        },
        searchPath: ['public'],
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
        cookieSecure: false,
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
    protectedSettings: '',
    protectedEntities: '',
    salt: 'default_test_salt',
};
