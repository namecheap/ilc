const uuidv4 = require('uuid/v4');
const extendError = require('@namecheap/error-extender');

const ErrorHandlingError = extendError('ErrorHandlingError');

module.exports = class ErrorHandler {
    #registryService;
    #errorsService;
    #logger;

    constructor(registryService, errorsService, logger) {
        this.#registryService = registryService;
        this.#errorsService = errorsService;
        this.#logger = logger;
    }

    noticeError(err, errInfo = {}) {
        const infoData = Object.assign({}, errInfo);
        if (err.data) {
            //TODO: fetch data from parent errors
            Object.assign(infoData, err.data);
        }

        this.#errorsService.noticeError(err, infoData);
        this.#logger.error(JSON.stringify({
            type: err.name,
            message: err.message,
            stack: err.stack.split("\n"),
            additionalInfo: infoData,
        }));
    }

    handleError = async (err, req, res) => {
        const errorId = uuidv4();

        // This handler serves as Fastify & Tailor handler.
        // While Fastify will pass it's own Reply object
        // Tailor passes http.ServerResponse from Node core
        let nres = res.res ? res.res : res;

        try {
            this.noticeError(err, {
                errorId
            });

            let data = await this.#registryService.getTemplate('500');
            data = data.data.content.replace('%ERRORID%', `Error ID: ${errorId}`);

            nres.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            nres.setHeader('Pragma', 'no-cache');
            nres.statusCode = 500;
            nres.write(data);
            nres.end();
        } catch (causeErr) {
            const err = new ErrorHandlingError({
                cause: causeErr,
                d: {
                    errorId,
                }
            });
            this.#logger.error(err);

            nres.statusCode = 500;
            nres.write('Oops! Something went wrong. Pls try to refresh page or contact support.');
            nres.end();
        }
    }
};

module.exports.ErrorHandlingError = ErrorHandlingError;
