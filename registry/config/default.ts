import path from 'node:path';

module.exports = {
    port: 4001,
    keepAliveTimeout: 5 * 60,
    database: {
        client: 'pg',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'pwd',
            database: 'ilc',
        },
        searchPath: ['public'],
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
