import * as fs from 'fs';
import * as path from 'path';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import safeJsonStringify from 'safe-json-stringify';
import { v4 as uuidv4 } from 'uuid';
import { extendError } from '../../common/utils';
import config from 'config';
import { readFileSync } from 'fs';
import { setErrorData } from '../utils/helpers';
import type { Logger } from 'ilc-plugins-sdk';
import type { Registry } from '../types/Registry';
import type { ServerResponse } from 'http';
import { ServerResponseFastifyReply, IlcResponse, isFastifyReply } from '../types/FastifyReply';
import { IlcRequest, ilcRequestDecorator } from '../types/IlcRequest';

const ErrorHandlingError = extendError('ErrorHandlingError');
const Test500Error = extendError('Test500Error');

const defaultErrorPage = fs.readFileSync(path.resolve(__dirname, '../assets/defaultErrorPage.html'), 'utf-8');

interface ErrorsService {
    noticeError(err: Error, customAttributes?: Record<string, any>): void;
}

interface NoticeErrorOptions {
    reportError?: boolean;
}

export default class ErrorHandler {
    private registryService: Registry;
    private errorsService: ErrorsService;
    private logger: Logger;
    private staticFileContent: string | null = null;

    constructor(registryService: Registry, errorsService: ErrorsService, logger: Logger) {
        this.registryService = registryService;
        this.errorsService = errorsService;
        this.logger = logger;
    }

    /**
     * Notice an error and log it appropriately
     * @param err - The error to notice
     * @param customAttributes - Additional attributes to attach to the error
     * @param options - Options for error reporting
     */
    noticeError(
        err: Error,
        customAttributes: Record<string, any> = {},
        { reportError = true }: NoticeErrorOptions = {},
    ): void {
        if (reportError) {
            this.errorsService.noticeError(err, { ...customAttributes });
            setErrorData(err, customAttributes);

            // Log Test500Error as WARN instead of ERROR to prevent alarming potential monitoring system
            if (err instanceof Test500Error) {
                this.logger.warn(err);
            } else {
                this.logger.error(err);
            }
        } else {
            setErrorData(err, { ...customAttributes, localError: true });
            this.logger.warn(err);
        }
    }

    async handleError(err: Error, req: IlcRequest, res: IlcResponse): Promise<void> {
        const errorId = uuidv4();
        // This handler serves as Fastify & Tailor handler.
        // While Fastify will pass it's own Reply object
        // Tailor passes http.ServerResponse from Node core
        let nres: ServerResponse;
        if (isFastifyReply(res)) {
            nres = res.res;
            // Claim full responsibility of the low-level response from Fastify
            res.sent = true;
        } else {
            nres = res as ServerResponse;
        }

        try {
            const ilcRequest = ilcRequestDecorator(req);
            this.noticeError(err, { errorId }, { reportError: ilcRequest.isLde() });
            const currentDomain = ilcRequest.getHostName();
            const locale = ilcRequest.getLocale();
            let data = await this.registryService.getTemplate('500', { locale, forDomain: currentDomain });
            const content = data.data.content.replace('%ERRORID%', `Error ID: ${errorId}`);

            this.ensureInternalErrorHeaders(nres, StatusCodes.INTERNAL_SERVER_ERROR);
            nres.write(content);
            nres.end();
        } catch (causeErr) {
            const handlingError = new ErrorHandlingError({
                message: 'Additional error in error handling',
                cause: causeErr as Error,
                data: { errorId, originalError: safeJsonStringify(err) },
            });
            this.logger.error(handlingError);
            this.writeStaticError(nres);
        }
    }

    async handleClientError(reply: ServerResponseFastifyReply, error: Error, statusCode?: number): Promise<void> {
        this.logger.warn(error);
        reply.sent = true;
        this.writeStaticError(reply.res!, statusCode);
    }

    private ensureInternalErrorHeaders(nres: ServerResponse, statusCode: number): void {
        nres.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        nres.setHeader('Pragma', 'no-cache');
        nres.setHeader('Content-Type', 'text/html; charset=utf-8');
        nres.statusCode = statusCode;
    }

    private writeStaticError(nres: ServerResponse, statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR): void {
        this.ensureInternalErrorHeaders(nres, statusCode);
        const errorPageTemplate = this.readStaticErrorPage(defaultErrorPage);
        const statusMessage = getReasonPhrase(statusCode);
        const errorPage = errorPageTemplate
            .replaceAll('%STATUS_CODE%', statusCode.toString())
            .replaceAll('%STATUS_MESSAGE%', statusMessage);
        nres.write(errorPage);
        nres.end();
    }

    private readStaticErrorPage(defaultContent: string): string {
        if (this.staticFileContent != null) {
            return this.staticFileContent;
        }

        const staticFilePath = config.get<string | null>('staticError.disasterFileContentPath');
        try {
            if (staticFilePath != null) {
                this.staticFileContent = readFileSync(staticFilePath).toString();
                return this.staticFileContent;
            }
        } catch (e) {
            this.logger.error(e as Error, 'Unable to read static file content');
        }

        return defaultContent;
    }
}

export { ErrorHandlingError, Test500Error };
