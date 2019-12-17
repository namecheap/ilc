import supertest from 'supertest';
import server from '../server/app';

export const request = supertest(server);

export { expect } from 'chai';
