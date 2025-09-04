import { ServerResponseFastifyReply, IlcResponse } from './FastifyReply';
import { IlcRequest } from './PatchedHttpRequest';

export interface ErrorHandler {
    noticeError(error: unknown, attributes?: Record<string, string>): void;
    handleClientError(reply: ServerResponseFastifyReply, error: unknown, code: number): void;
    handleError(err: Error, req: IlcRequest, res: IlcResponse): Promise<void>;
}
