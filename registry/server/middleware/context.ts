import { Request, RequestHandler } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 } from 'uuid';

import { User } from '../auth';
import { getPluginManagerInstance } from '../util/pluginManager';
import { TypedMap } from '../util/TypedMap';

export interface Store {
    reqId: string;
    domain: string;
    user?: User;
    path: string;
    clientIp?: string;
}

export const storage = new AsyncLocalStorage<TypedMap<Store>>();

export const contextMiddleware: RequestHandler = (req, res, next) => {
    const store = new TypedMap<Store>();

    storage.run(store, () => {
        store.set('reqId', getPluginManagerInstance().getReportingPlugin().genReqId?.() ?? v4());
        store.set('domain', req.hostname);
        store.set('path', req.path);
        store.set('clientIp', getUserIp(req));
        next();
    });
};

function getUserIp(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const headerValue = Array.isArray(forwarded)
        ? forwarded[0] // If it's an array, take the first one
        : forwarded;
    return typeof headerValue === 'string' ? headerValue.split(',')[0] : req.socket.remoteAddress;
}
