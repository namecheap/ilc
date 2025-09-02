module.exports = {
    database: {
        client: 'sqlite3',
        connection: {
            database: 'registry_db',
            filename: './server/dbfiles/db.sqlite',
        },
        useNullAsDefault: true,
    },
    protectedSettings: 'cspConfig,baseUrl',
};
