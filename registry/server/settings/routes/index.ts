import express, { RequestHandler } from 'express';

import getSettings from './getSettings';
import getSetting from './getSetting';
import updateSetting from './updateSetting';
import createSetting from './createSetting';
import deleteDomainSetting from './deleteDomainSetting';

export default (authMw: RequestHandler[]) => {
    const router = express.Router();

    router.get('/', authMw, ...getSettings);
    router.get('/:key', authMw, ...getSetting);
    router.put('/:key', authMw, ...updateSetting);
    router.post('/', authMw, ...createSetting);
    router.delete('/:id', authMw, ...deleteDomainSetting);

    return router;
};
