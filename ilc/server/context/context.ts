import { RequestContext, type RequestContextData, asyncLocalStorage, requestContext } from '@fastify/request-context';
import parseUrl from 'parseurl';
import { type PatchedFastifyRequest } from '../types/PatchedHttpRequest';

export class Context {
    public run(store: RequestContextData, callback: () => unknown) {
        // The library typing is incorrect
        asyncLocalStorage.run(store as unknown as RequestContext, callback);
    }

    public get(key: keyof RequestContextData): string | undefined {
        return requestContext.get(key);
    }

    public set(key: keyof RequestContextData, value: string) {
        requestContext.set(key, value);
    }

    public createFromRequest(req: PatchedFastifyRequest, requestId: string): RequestContextData {
        const parsedUrl = parseUrl(req.raw);
        return {
            requestId,
            url: req.raw.url ?? '',
            domain: req.host,
            path: parsedUrl?.pathname ?? '',
            protocol: req.raw.socket ? 'https' : 'http',
        };
    }
}

export const context = new Context();
