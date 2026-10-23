import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { UnprocessableContent } from '../../errorHandler/httpErrors';

interface RequestSchemas {
    params?: z.ZodType;
    query?: z.ZodType;
    body?: z.ZodType;
    /** The JSON in the `filter` query parameter of list requests, an empty object when there is none */
    filters?: z.ZodType;
}

export type ValidatedInput<S extends RequestSchemas> = {
    [K in keyof S]: S[K] extends z.ZodType ? z.output<S[K]> : never;
};

type ValidatedHandler<S extends RequestSchemas> = (
    input: ValidatedInput<S>,
    req: Request,
    res: Response,
) => Promise<void>;

// Same order validateRequestFactory reported errors in: params before body
const SELECTORS = ['params', 'query', 'body'] as const;

/**
 * Parses the request parts that have a schema and hands the parsed values to the handler,
 * typed from the schemas. The request itself is left as it came.
 * A failed parse is a 422 with Zod's error summary, a missing body a 400.
 * Invalid filters are a 400 with `{ error }`, as filtersMiddleware answered.
 */
export function validated<S extends RequestSchemas>(schemas: S, handler: ValidatedHandler<S>): RequestHandler {
    return async (req, res) => {
        if (schemas.body && req.body === undefined) {
            res.status(400).send('Missing body in request');
            return;
        }

        const input: Partial<Record<keyof RequestSchemas, unknown>> = {};

        if (schemas.filters) {
            const result = await parseFilters(schemas.filters, req.query.filter);
            if (!result.success) {
                res.status(400).json({ error: result.error });
                return;
            }
            input.filters = result.data;
        }

        for (const selector of SELECTORS) {
            const schema = schemas[selector];
            if (!schema) {
                continue;
            }

            const result = await schema.safeParseAsync(req[selector]);
            if (!result.success) {
                throw new UnprocessableContent({ message: z.prettifyError(result.error) });
            }
            input[selector] = result.data;
        }

        await handler(input as ValidatedInput<S>, req, res);
    };
}

async function parseFilters(
    schema: z.ZodType,
    filter: unknown,
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    let value: unknown = {};
    if (filter !== undefined) {
        try {
            value = typeof filter === 'string' ? JSON.parse(filter) : filter;
        } catch {
            return { success: false, error: 'Invalid JSON in "filter" query parameter' };
        }
    }

    const result = await schema.safeParseAsync(value);
    return result.success
        ? { success: true, data: result.data }
        : { success: false, error: z.prettifyError(result.error) };
}
