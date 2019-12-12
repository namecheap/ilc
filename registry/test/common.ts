import supertest from 'supertest';
import server from '../server/index';

export const request = supertest(server);

export { expect } from 'chai';