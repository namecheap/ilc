import axios, { AxiosError } from 'axios';
import { setTimeout } from 'node:timers/promises';

function isRetryableError(error: AxiosError): boolean {
    return (
        !error.response ||
        error.response.status === 429 ||
        (error.response.status >= 500 && error.response.status <= 599)
    );
}
type ExponentialRetryOptions = {
    attempt?: number;
    baseDelay?: number;
    maxAttempts?: number;
    maxDelay?: number;
};

export async function exponentialRetry<T extends () => any>(
    fn: T,
    { attempt = 1, maxAttempts = 5, baseDelay = 100, maxDelay = 10_000 }: ExponentialRetryOptions = {},
): Promise<ReturnType<T>> {
    try {
        return await fn();
    } catch (error) {
        if (attempt < maxAttempts && axios.isAxiosError(error) && isRetryableError(error)) {
            const delay = Math.min(2 ** attempt * baseDelay, maxDelay);
            const jitter = Math.round(Math.random() * delay);
            await setTimeout(jitter);
            return exponentialRetry(fn, { attempt: attempt + 1, maxAttempts, maxDelay, baseDelay });
        } else {
            throw error;
        }
    }
}
