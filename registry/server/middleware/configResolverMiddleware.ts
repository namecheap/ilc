import { RequestHandler, NextFunction, Request, Response } from 'express';
import { ConfigFilter } from '../config';
import { RoutesFilter } from "../config/filters/RoutesFilter";
import { SpecialRoutesFilter } from "../config/filters/SpecialRoutesFilter";

export const configResolverMiddleware: RequestHandler = (
    (request: Request, response: Response, next: NextFunction): void => {
        const { data } = response.locals;
        if(!data) throw new Error(
            'Data is not provided through middleware'
        );

        const domain = request.hostname;
        const filters = [
            RoutesFilter, SpecialRoutesFilter
        ] as const;
        const configFilter = new ConfigFilter(data);
        const result = configFilter.filter(
            filters.map(Ctor => new Ctor([domain]))
        );

        response.json(result);
        next();
    }
)
