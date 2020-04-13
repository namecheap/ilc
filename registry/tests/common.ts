import supertest from 'supertest';
import app from '../server/app';

export const request = supertest(app(false));
export const requestWithAuth = supertest(app(true));

export { expect } from 'chai';
