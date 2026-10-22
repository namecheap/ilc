import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { UnprocessableContent } from '../../errorHandler/httpErrors';

interface RequestSchemas {
    params?: z.ZodType;
    query?: z.ZodType;
    body?: z.ZodType;
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
 */
export function validated<S extends RequestSchemas>(schemas: S, handler: ValidatedHandler<S>): RequestHandler {
    return async (req, res) => {
        if (schemas.body && req.body === undefined) {
            res.status(400).send('Missing body in request');
            return;
        }

        const input: Partial<Record<(typeof SELECTORS)[number], unknown>> = {};

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
