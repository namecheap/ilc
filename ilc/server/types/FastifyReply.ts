import { FastifyReply, RouteGenericInterface } from 'fastify';
import type { ServerResponse, Server } from 'http';
import { PatchedHttpRequest } from './PatchedHttpRequest';

export type ServerResponseFastifyReply<RouteGeneric extends RouteGenericInterface = RouteGenericInterface> =
    FastifyReply<RouteGeneric, Server, PatchedHttpRequest, ServerResponse>;

export type IlcResponse = ServerResponseFastifyReply | ServerResponse;

export const isFastifyReply = (response: unknown): response is ServerResponseFastifyReply => {
    return !!response && typeof response === 'object' && 'raw' in response;
};
