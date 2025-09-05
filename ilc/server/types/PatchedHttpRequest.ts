import { IncomingMessage } from 'http';
import ServerRouter from '../tailor/server-router';
import { TransformedRegistryConfig } from './Registry';
import { FastifyRequest } from 'fastify';

export interface IlcState {
    locale?: string;
    forceSpecialRoute?: string;
}

export interface PatchedHttpRequest extends IncomingMessage {
    url: string;
    ldeRelated?: boolean;
    router?: ServerRouter;
    ilcState?: IlcState;
    registryConfig?: TransformedRegistryConfig;
}

export type PatchedFastifyRequest = FastifyRequest<PatchedHttpRequest>;

export const isFastifyRequest = (request: any): request is PatchedFastifyRequest => {
    return request && typeof request === 'object' && 'raw' in request;
};
