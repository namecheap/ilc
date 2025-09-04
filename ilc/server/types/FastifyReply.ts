import { FastifyReply } from 'fastify';
import { ServerResponse } from 'http';

export type ServerResponseFastifyReply = FastifyReply<ServerResponse>;

export type IlcResponse = ServerResponseFastifyReply | ServerResponse;

export const isFastifyReply = (response: any): response is ServerResponseFastifyReply => {
    return response && typeof response === 'object' && 'res' in response;
};
