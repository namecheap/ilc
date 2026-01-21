import { type AxiosError, type RawAxiosResponseHeaders, type AxiosResponseHeaders } from 'axios';
import { extendError } from './extendError';
import { sanitizeHeaders, truncateBody } from './helpers';

const IlcAxiosError = extendError('AxiosError');

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
