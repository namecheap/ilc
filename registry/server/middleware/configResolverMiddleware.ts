import { RequestHandler, NextFunction, Request, Response } from 'express';
import { ConfigFilter } from '../config';
import { RoutesFilter } from "../config/filters/RoutesFilter";
import { SpecialRoutesFilter } from "../config/filters/SpecialRoutesFilter";

export const configResolverMiddleware: RequestHandler = (
    (request: Request, response: Response, next: NextFunction): void => {
        const { data } = response.locals;
        const domain = request.hostname;
        const filters = new Map();
        filters.set(RoutesFilter.accessPath, RoutesFilter);
        filters.set(SpecialRoutesFilter.accessPath, SpecialRoutesFilter);
        const configFilter = new ConfigFilter(data, filters);
        const result = configFilter.filter(domain);
        response.json(result);
        next();
    }
)
