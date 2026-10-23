import express, { RequestHandler } from 'express';
import { getConfig } from './getConfig';
import type { ConfigService } from './ConfigService';
import { updateConfig } from './updateConfig';
import { validateConfig } from './validateConfig';

export function routerFactory(authMw: RequestHandler[], configService: ConfigService) {
    const router = express.Router();
    router.get('/', getConfig);
    router.post('/validate', authMw, validateConfig(configService));
    router.put('/', authMw, updateConfig(configService));
    return router;
}
