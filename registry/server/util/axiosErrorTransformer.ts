import errorExtender from '@namecheap/error-extender';
import type { AxiosError } from 'axios';

const IlcAxiosError = errorExtender('AxiosError');

export function isAxiosError(err: unknown): err is AxiosError {
    return Boolean((err as AxiosError)?.isAxiosError);
}

export function axiosErrorTransformer<T = unknown>(err: T): typeof IlcAxiosError | T {
    return isAxiosError(err)
        ? new IlcAxiosError({
              message: err.message,
              data: {
                  response: {
                      status: err.response?.status,
                      data: err.response?.data,
                      headers: err.response?.headers,
                  },
                  url: err.config.url,
                  method: err.config.method,
                  payload: err.config.data,
                  headers: err.config.headers,
              },
          })
        : err;
}
