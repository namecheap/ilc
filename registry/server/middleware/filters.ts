import type { ObjectSchema } from 'joi';
import type { Request, Response } from 'express';

export interface RequestWithFilters<T extends Record<string, any>> extends Request {
    filters?: T;
}
export const filtersMiddleware =
    <T extends Record<string, any>>(schema: ObjectSchema<T>) =>
    (req: Request, res: Response, next: () => void): void => {
        const parsedFilters = schema.validate(req.query.filter ? JSON.parse(req.query.filter as string) : {});
        if (parsedFilters.error) {
            res.status(400).json({ error: parsedFilters.error.message });
            return;
        }
        (req as RequestWithFilters<T>).filters = parsedFilters.value;
        next();
    };
