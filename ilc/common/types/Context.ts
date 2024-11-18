import type { AsyncLocalStorage } from 'node:async_hooks';

export type ContextKey = 'requestId' | 'url' | 'domain' | 'path' | 'protocol';
export type Store = Map<ContextKey, string>;
export type Context = AsyncLocalStorage<Store>;
