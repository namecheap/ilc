import { RequestHandler } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 } from 'uuid';

import { User } from '../auth';
import { getPluginManagerInstance } from '../util/pluginManager';
import { TypedMap } from '../util/TypedMap';

export interface Store {
    reqId: string;
    domain: string;
    user?: User;
}

export const storage = new AsyncLocalStorage<TypedMap<Store>>();

export const contextMiddleware: RequestHandler = (req, res, next) => {
    const store = new TypedMap<Store>();

    storage.run(store, () => {
        store.set('reqId', getPluginManagerInstance().getReportingPlugin().genReqId?.() ?? v4());
        store.set('domain', req.hostname);
        next();
    });
};
