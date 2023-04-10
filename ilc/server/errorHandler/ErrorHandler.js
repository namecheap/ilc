const uuidv4 = require('uuid/v4');
const extendError = require('@namecheap/error-extender');
const config = require('config');
const { readFileSync } = require('fs');
const ErrorHandlingError = extendError('ErrorHandlingError');
const defaultErrorPage = require('./defaultErrorPage');

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
     * @param {Error} err
     * @param {any} errInfo
     * @param {Object} options
     * @param {Boolean} options.reportError = true
     */
    noticeError(err, errInfo = {}, options) {
        const infoData = Object.assign({}, errInfo);
        options = Object.assign(
            {},
            {
                reportError: true,
            },
            options,
        );

        if (err.data === undefined) {
            const ExtendedError = extendError(err.name);
            err = new ExtendedError({ cause: err, data: infoData, message: err.message });
        } else {
            Object.assign(err.data, infoData);
        }

        if (options.reportError) {
            this.#errorsService.noticeError(err, infoData);
            this.#logger.error(err);
        } else {
            err.data.localError = true;
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
            this.noticeError(
                err,
                {
                    reqId: req.id,
                    errorId,
                    domain: req.hostname,
                    url: req.url,
                },
                { reportError: !req.ldeRelated },
            );

            const currentDomain = req.hostname;
            const locale = (req.raw || req).ilcState.locale;
            let data = await this.#registryService.getTemplate('500', { locale, forDomain: currentDomain });
            data = data.data.content.replace('%ERRORID%', `Error ID: ${errorId}`);

            nres.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            nres.setHeader('Pragma', 'no-cache');
            nres.statusCode = 500;
            nres.write(data);
            nres.end();
        } catch (causeErr) {
            const e = new ErrorHandlingError({
                cause: causeErr,
                d: {
                    errorId,
                },
            });

            this.#logger.error(e);
            this.#writeStaticError(nres);
        }
    };

    #writeStaticError(nres) {
        nres.statusCode = 500;
        let content = this.#readStaticErrorPage(defaultErrorPage);

        nres.write(content);
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
