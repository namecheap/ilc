import { type AxiosError, type RawAxiosResponseHeaders, type AxiosResponseHeaders } from 'axios';
import { extendError } from './extendError';

const IlcAxiosError = extendError('AxiosError');

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token', 'proxy-authorization'];

const MAX_BODY_LENGTH = 1000;

type HeadersInput = RawAxiosResponseHeaders | AxiosResponseHeaders | Record<string, unknown> | undefined;

/**
 * Sanitizes headers by redacting sensitive values
 */
export function sanitizeHeaders(headers: HeadersInput): Record<string, unknown> | undefined {
    if (!headers || typeof headers !== 'object') {
        return undefined;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_HEADERS.includes(lowerKey)) {
            sanitized[key] = '[REDACTED]';
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Truncates body content if too large, returns metadata for non-string bodies
 */
export function truncateBody(body: unknown): { content: unknown; truncated?: boolean; type?: string; length?: number } {
    if (body === undefined || body === null) {
        return { content: body };
    }

    // Handle string bodies
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

    // Handle objects - try to stringify
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
            // Circular reference or non-serializable
            return {
                content: '[Non-serializable object]',
                type: typeof body,
            };
        }
    }

    // Handle other types (number, boolean, etc.)
    return { content: body };
}

/**
 * Safely stringifies a value, handling circular references
 */
export function safeStringify(value: unknown): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return '[Circular or non-serializable]';
    }
}

export function isAxiosError(err: unknown): err is AxiosError {
    return Boolean((err as AxiosError)?.isAxiosError);
}

interface NetworkErrorDetails {
    code?: string;
    errno?: number | string;
    syscall?: string;
    cause?: string;
}

/**
 * Extracts network-level error details from an AxiosError
 */
function getNetworkErrorDetails(err: AxiosError): NetworkErrorDetails {
    const details: NetworkErrorDetails = {};

    // err.code contains network error codes like ECONNREFUSED, ETIMEDOUT, etc.
    if (err.code) {
        details.code = err.code;
    }

    // Access low-level error properties if available
    const anyErr = err as unknown as Record<string, unknown>;
    if (typeof anyErr.errno === 'number' || typeof anyErr.errno === 'string') {
        details.errno = anyErr.errno;
    }
    if (typeof anyErr.syscall === 'string') {
        details.syscall = anyErr.syscall;
    }

    // Extract cause message if available
    if (err.cause instanceof Error) {
        details.cause = err.cause.message;
    } else if (typeof err.cause === 'string') {
        details.cause = err.cause;
    }

    return details;
}

/**
 * Generates a meaningful error message, with fallback for network errors
 */
function getErrorMessage(err: AxiosError): string {
    if (err.message) {
        return err.message;
    }

    // Fallback for network errors that may have empty message
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
            // Existing fields (preserved for backward compatibility)
            response: {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: responseBody.content,
                dataTruncated: responseBody.truncated,
                dataLength: responseBody.length,
                headers: sanitizeHeaders(err.response?.headers),
            },
            url: err.config?.url,
            method: err.config?.method,
            payload: requestPayload.content,
            payloadTruncated: requestPayload.truncated,
            payloadLength: requestPayload.length,
            headers: sanitizeHeaders(err.config?.headers as HeadersInput),

            // New fields for enhanced diagnostics
            baseURL: err.config?.baseURL,
            timeout: err.config?.timeout,

            // Network error details
            ...networkDetails,
        },
    });
}
