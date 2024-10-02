import errorExtender, { type ExtendConfig } from '@namecheap/error-extender';

export function extendError<T = any>(name: string, options: ExtendConfig<T> = {}) {
    return errorExtender(name, { ...options, inverse: true });
}
