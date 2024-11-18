import { FastifyReply } from 'fastify';
import http from 'http';

export interface ErrorHandler {
    noticeError(error: unknown, attributes: Record<string, string>): void;
    handleClientError(reply: FastifyReply<http.ServerResponse>, error: unknown, code: number): void;
}
