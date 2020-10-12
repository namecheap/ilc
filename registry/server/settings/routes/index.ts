import express, {RequestHandler} from 'express';

import getSettings from './getSettings';
import getSetting from './getSetting';
import updateSetting from './updateSetting';

export default (authMw: RequestHandler) => {
    const router = express.Router();

    router.get('/', authMw, ...getSettings);
    router.get('/:key', authMw, ...getSetting);
    router.put('/:key', authMw, ...updateSetting);

    return router;
};
