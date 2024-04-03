const fs = require('fs');
const path = require('path');
const { StatusCodes, getReasonPhrase } = require('http-status-codes');
const safeJsonStringify = require('safe-json-stringify');
const uuidv4 = require('uuid/v4');
const extendError = require('@namecheap/error-extender');
const config = require('config');
const { readFileSync } = require('fs');
const { setErrorData } = require('../utils/helpers');
const ErrorHandlingError = extendError('ErrorHandlingError');

const defaultErrorPage = fs.readFileSync(path.resolve(__dirname, '../assets/defaultErrorPage.html'), 'utf-8');

module.exports = class ErrorHandler {
    #registryService;
    #errorsService;
    #logger;
    #staticFileContent = null;

    constructor(registryService, errorsService, logger) {
        this.#registryService = registryService;
        this.#errorsService = errorsService;
        this.#logger = logger;
    }

    /**
     *
     * @param {any} err
     * @param {any} errInfo
     * @param {Object} [options]
     * @param {Boolean} options.reportError = true
     */
    noticeError(err, customAttributes = {}, { reportError = true } = {}) {
        if (reportError) {
            this.#errorsService.noticeError(err, { ...customAttributes });
            setErrorData(err, customAttributes);
            this.#logger.error(err);
        } else {
            setErrorData(err, { ...customAttributes, localError: true });
            this.#logger.warn(err);
        }
    }

    handleError = async (err, req, res) => {
        const errorId = uuidv4();
        // This handler serves as Fastify & Tailor handler.
        // While Fastify will pass it's own Reply object
        // Tailor passes http.ServerResponse from Node core
        let nres = res.res ? res.res : res;
        // Claim full responsibility of the low-level response from Fastify
        if (res.res) {
            res.sent = true;
        }

        try {
            this.noticeError(err, { errorId }, { reportError: !req.ldeRelated });
            const currentDomain = req.hostname;
            const locale = (req.raw || req).ilcState.locale;
            let data = await this.#registryService.getTemplate('500', { locale, forDomain: currentDomain });
            data = data.data.content.replace('%ERRORID%', `Error ID: ${errorId}`);

            this.#ensureInternalErrorHeaders(nres, StatusCodes.INTERNAL_SERVER_ERROR);
            nres.write(data);
            nres.end();
        } catch (causeErr) {
            const handlingError = new ErrorHandlingError({
                message: 'Additional error in error handling',
                cause: causeErr,
                data: { errorId, originalError: safeJsonStringify(err) },
            });
            this.#logger.error(handlingError);
            this.#writeStaticError(nres);
        }
    };

    async handleClientError(reply, error, statusCode) {
        this.#logger.warn(error);
        reply.sent = true;
        this.#writeStaticError(reply.res, statusCode);
    }

    #ensureInternalErrorHeaders(nres, statusCode) {
        nres.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        nres.setHeader('Pragma', 'no-cache');
        nres.setHeader('Content-Type', 'text/html; charset=utf-8');
        nres.statusCode = statusCode;
    }

    #writeStaticError(nres, statusCode = StatusCodes.INTERNAL_SERVER_ERROR) {
        this.#ensureInternalErrorHeaders(nres, statusCode);
        const errorPageTemplate = this.#readStaticErrorPage(defaultErrorPage);
        const statusMessage = getReasonPhrase(statusCode);
        const errorPage = errorPageTemplate
            .replaceAll('%STATUS_CODE%', statusCode)
            .replaceAll('%STATUS_MESSAGE%', statusMessage);
        nres.write(errorPage);
        nres.end();
    }

    #readStaticErrorPage(defaultContent) {
        if (this.#staticFileContent != null) {
            return this.#staticFileContent;
        }

        const staticFilePath = config.get('staticError.disasterFileContentPath');
        try {
            if (staticFilePath != null) {
                this.#staticFileContent = readFileSync(staticFilePath).toString();
                return this.#staticFileContent;
            }
        } catch (e) {
            this.#logger.error(e, 'Unable to read static file content');
        }

        return defaultContent;
    }
};

module.exports.ErrorHandlingError = ErrorHandlingError;
