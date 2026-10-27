import { type AxiosError, type RawAxiosResponseHeaders, type AxiosResponseHeaders } from 'axios';
import { extendError } from './extendError';

const IlcAxiosError = extendError('AxiosError');

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token', 'proxy-authorization'];

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

const MAX_BODY_LENGTH = 1000;

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

type HeadersInput = RawAxiosResponseHeaders | AxiosResponseHeaders | Record<string, unknown> | undefined;

export function isAxiosError(err: unknown): err is AxiosError {
    return Boolean((err as AxiosError)?.isAxiosError);
}

interface NetworkErrorDetails {
    code?: string;
    errno?: number | string;
    syscall?: string;
    cause?: string;
}

function getNetworkErrorDetails(err: AxiosError): NetworkErrorDetails {
    const details: NetworkErrorDetails = {};

    if (err.code) {
        details.code = err.code;
    }

    const anyErr = err as unknown as Record<string, unknown>;
    if (typeof anyErr.errno === 'number' || typeof anyErr.errno === 'string') {
        details.errno = anyErr.errno;
    }
    if (typeof anyErr.syscall === 'string') {
        details.syscall = anyErr.syscall;
    }

    if (err.cause instanceof Error) {
        details.cause = err.cause.message;
    } else if (typeof err.cause === 'string') {
        details.cause = err.cause;
    }

    return details;
}

function getErrorMessage(err: AxiosError): string {
    if (err.message) {
        return err.message;
    }

    if (err.code) {
        const url = err.config?.url || 'unknown URL';
        return `${err.code}: ${url}`;
    }

    return 'Unknown Axios Error';
}

export function axiosErrorTransformer<T = unknown>(err: T): typeof IlcAxiosError | T {
    if (!isAxiosError(err)) {
        return err;
    }

    const networkDetails = getNetworkErrorDetails(err);
    const requestPayload = truncateBody(err.config?.data);
    const responseBody = truncateBody(err.response?.data);

    return new IlcAxiosError({
        message: getErrorMessage(err),
        data: {
            response: {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: responseBody.content,
                dataTruncated: responseBody.truncated,
                dataLength: responseBody.length,
                headers: sanitizeHeaders(err.response?.headers as HeadersInput),
            },
            url: err.config?.url,
            method: err.config?.method,
            payload: requestPayload.content,
            payloadTruncated: requestPayload.truncated,
            payloadLength: requestPayload.length,
            headers: sanitizeHeaders(err.config?.headers as HeadersInput),
            baseURL: err.config?.baseURL,
            timeout: err.config?.timeout,
            ...networkDetails,
        },
    });
}
