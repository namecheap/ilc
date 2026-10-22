import { expect } from 'chai';
import Joi from 'joi';
import { z } from 'zod';
import { formatValidationError } from '../../server/common/validation/formatValidationError';
import { jsonObjectSchema } from '../../server/common/validation/schemas';
import { joiErrorToResponse } from '../../server/util/helpers';

function joiMessage(schema: Joi.Schema, value: unknown): string {
    const { error } = schema.validate(value, { abortEarly: false });
    if (!error) {
        throw new Error('Joi accepted the value');
    }
    return joiErrorToResponse(error);
}

function zodMessage(schema: z.ZodType, value: unknown): string {
    const result = schema.safeParse(value, { reportInput: true });
    if (result.success) {
        throw new Error('Zod accepted the value');
    }
    return formatValidationError(result.error);
}

describe('formatValidationError', () => {
    const cases: { title: string; joi: Joi.Schema; zod: z.ZodType; value: unknown }[] = [
        {
            title: 'missing required keys',
            joi: Joi.object({ props: Joi.object().required(), name: Joi.string().required() }),
            zod: z.strictObject({ props: jsonObjectSchema, name: z.string() }),
            value: {},
        },
        {
            title: 'wrong types',
            joi: Joi.object({
                props: Joi.object(),
                name: Joi.string(),
                list: Joi.array(),
                count: Joi.number(),
                flag: Joi.boolean(),
            }),
            zod: z.strictObject({
                props: jsonObjectSchema.optional(),
                name: z.string().optional(),
                list: z.array(z.string()).optional(),
                count: z.number().optional(),
                flag: z.boolean().optional(),
            }),
            value: { props: 456, name: 123, list: 'a', count: 'a', flag: 'a' },
        },
        {
            title: 'null where an object is expected',
            joi: Joi.object({ props: Joi.object() }),
            zod: z.strictObject({ props: jsonObjectSchema.optional() }),
            value: { props: null },
        },
        {
            title: 'array where an object is expected',
            joi: Joi.object({ props: Joi.object() }),
            zod: z.strictObject({ props: jsonObjectSchema.optional() }),
            value: { props: [1] },
        },
        {
            title: 'unknown keys after the declared ones',
            joi: Joi.object({ props: Joi.object() }),
            zod: z.strictObject({ props: jsonObjectSchema.optional() }),
            value: { foo: 1, props: 1, bar: 2 },
        },
        {
            title: 'string length limits',
            joi: Joi.object({ empty: Joi.string().min(1), short: Joi.string().min(3), long: Joi.string().max(2) }),
            zod: z.strictObject({
                empty: z.string().min(1).optional(),
                short: z.string().min(3).optional(),
                long: z.string().max(2).optional(),
            }),
            value: { empty: '', short: 'ab', long: 'abc' },
        },
        {
            title: 'number limits',
            joi: Joi.object({
                int: Joi.number().integer(),
                positive: Joi.number().positive(),
                max: Joi.number().max(5),
            }),
            zod: z.strictObject({
                int: z.number().int().optional(),
                positive: z.number().positive().optional(),
                max: z.number().max(5).optional(),
            }),
            value: { int: 1.5, positive: -1, max: 6 },
        },
        {
            title: 'allowed values',
            joi: Joi.object({ kind: Joi.string().valid('primary', 'regular'), one: Joi.string().valid('404') }),
            zod: z.strictObject({ kind: z.enum(['primary', 'regular']).optional(), one: z.enum(['404']).optional() }),
            value: { kind: 'other', one: '500' },
        },
        {
            title: 'uri and pattern',
            joi: Joi.object({ url: Joi.string().uri(), alias: Joi.string().pattern(/^[a-z0-9-]+$/) }),
            zod: z.strictObject({
                url: z.url().optional(),
                alias: z
                    .string()
                    .regex(/^[a-z0-9-]+$/)
                    .optional(),
            }),
            value: { url: 'not a url', alias: 'Not_Valid' },
        },
        {
            title: 'nested paths and array indexes',
            joi: Joi.object({
                slots: Joi.object().pattern(Joi.string(), Joi.object({ appName: Joi.string().required() })),
                items: Joi.array().items(Joi.string()),
            }),
            zod: z.strictObject({
                slots: z.record(z.string(), z.strictObject({ appName: z.string() })).optional(),
                items: z.array(z.string()).optional(),
            }),
            value: { slots: { body: {} }, items: ['a', 1] },
        },
        {
            title: 'a value that is not an object',
            joi: Joi.object({}),
            zod: z.strictObject({}),
            value: 'text',
        },
    ];

    for (const { title, joi, zod, value } of cases) {
        it(`should word ${title} the way Joi does`, () => {
            expect(zodMessage(zod, value)).to.equal(joiMessage(joi, value));
        });
    }

    it('should pass messages of custom checks through unchanged', () => {
        const schema = z.string().refine(() => false, { message: 'Specified wrapper app is not a wrapper.' });

        expect(zodMessage(schema, 'app')).to.equal('Specified wrapper app is not a wrapper.');
    });
});
