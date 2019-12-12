declare global {
    namespace NodeJS {
        interface Global {
           request: any
        } 
    }
}

import supertest from 'supertest';
import server = require('../server/index');

export const request = supertest(server);
