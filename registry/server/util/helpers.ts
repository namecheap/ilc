import Joi, { ValidationError } from 'joi';
import _fp from 'lodash/fp';

export const joiErrorToResponse = _fp.compose<
    Array<Joi.ValidationError>,
    Array<Joi.ValidationErrorItem>,
    Array<string | undefined>,
    string
>(_fp.join('\n'), _fp.map(_fp.get('message')), _fp.get('details'));

export function getJoiErr(path: string, message: string, input?: any) {
    return new ValidationError(
        'ValidationError',
        [
            {
                message,
                path: [path],
                type: 'any.custom',
            },
        ],
        undefined,
    );
}

export const uniqueArray = (array: any[]) => [...new Set(array)];

export function defined<T>(value: T | null | undefined): T {
    if (value === undefined || value === null) {
        throw new Error(`Expected value to be defined, but received ${value}`);
    }
    return value;
}

export function setErrorData(error: Error, data: Record<string, string | number | boolean>): void {
    if ('data' in error && typeof error.data === 'object' && error.data !== null) {
        Object.assign(error.data, data);
    } else {
        Object.defineProperty(error, 'data', { enumerable: true, writable: false, value: data });
    }
}

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token', 'proxy-authorization'];
const MAX_BODY_LENGTH = 1000;

export function sanitizeHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!headers || typeof headers !== 'object') {
        return undefined;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (!SENSITIVE_HEADERS.includes(lowerKey)) {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

export function truncateBody(body: unknown): { content: unknown; truncated?: boolean; type?: string; length?: number } {
    if (body === undefined || body === null) {
        return { content: body };
    }

    if (typeof body === 'string') {
        if (body.length > MAX_BODY_LENGTH) {
            return {
                content: body.substring(0, MAX_BODY_LENGTH),
                truncated: true,
                length: body.length,
            };
        }
        return { content: body };
    }

    if (typeof body === 'object') {
        try {
            const stringified = JSON.stringify(body);
            if (stringified.length > MAX_BODY_LENGTH) {
                return {
                    content: stringified.substring(0, MAX_BODY_LENGTH),
                    truncated: true,
                    length: stringified.length,
                    type: 'object',
                };
            }
            return { content: body };
        } catch {
            return {
                content: '[Non-serializable object]',
                type: typeof body,
            };
        }
    }

    return { content: body };
}
