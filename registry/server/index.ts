import path from 'path';

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
require('newrelic'); //Should be lower then NODE_CONFIG_DIR env var definition

import app from './app';
import server from './server';

console.log('Booting application...');
app()
    .then(app => {
        console.log('Application bootup finished successfully!');
        server(app);
    })
    .catch(err => {
        console.error('Error during application boot...');
        console.error(err);
    });
