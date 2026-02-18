import type { IncomingMessage, Server } from 'http';
import ServerRouter from '../tailor/server-router';
import { TransformedRegistryConfig } from './Registry';
import { FastifyRequest, RouteGenericInterface } from 'fastify';

export interface IlcState {
    locale?: string;
    forceSpecialRoute?: string;
}

export interface PatchedHttpRequest extends IncomingMessage {
    ldeRelated?: boolean;
    router?: ServerRouter;
    ilcState?: IlcState;
    registryConfig?: TransformedRegistryConfig;
}

export type PatchedFastifyRequest<RouteGeneric extends RouteGenericInterface = RouteGenericInterface> = FastifyRequest<
    RouteGeneric,
    Server,
    PatchedHttpRequest
>;

export const isFastifyRequest = (request: any): request is PatchedFastifyRequest => {
    return request && typeof request === 'object' && 'raw' in request;
};
