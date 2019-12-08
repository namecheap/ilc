const supertest = require('supertest');
global.request = supertest(require('../build/server/index.js'));
