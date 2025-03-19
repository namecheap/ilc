import express, { RequestHandler } from 'express';
import { getConfig } from './getConfig';
import validateConfig from './validateConfig';

export function routerFactory(authMw: RequestHandler[]) {
    const router = express.Router();
    router.get('/', getConfig);
    router.post('/validate', authMw, validateConfig);
    return router;
}
