module.exports = {
    port: 4001,
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
    },
    newrelic: {
        licenseKey: null,
    }
};
