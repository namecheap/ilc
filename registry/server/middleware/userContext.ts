import { Handler } from 'express';
import { storage } from './context';

export const userContextMiddleware: Handler = (req, res, next) => {
    storage.getStore()?.set('user', req.user);
    next();
};
