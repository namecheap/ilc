import IlcEvents from '../constants/ilcEvents';
import { BaseError, UnhandledError, FetchTemplateError, CriticalRuntimeError, CriticalInternalError } from '../errors';

export default class ErrorHandlerManager {
    #ilcAlreadyCrashed = false;

    #logger;

    #registryService;

    constructor(logger, registryService) {
        this.#logger = logger;
        this.#registryService = registryService;
    }

    handleError(error) {
        if (!(error instanceof BaseError)) {
            error = new UnhandledError({
                message: error.message,
                cause: error,
            });
        }

        // Ignoring all consequent errors after crash
        if (this.#ilcAlreadyCrashed) {
            this.#logger.info(`Ignoring error as we already crashed...\n${error.stack}`);
            return;
        }

        if (this.#isCriticalError(error)) {
            this.#logger.fatal(error.message, error);
            this.#crashIlc(error);

            return;
        }

        this.#logger.error(error.message, error);
    }

    #isCriticalError(error) {
        return error instanceof CriticalInternalError || error instanceof CriticalRuntimeError;
    }

    #crashIlc(error) {
        this.#registryService
            .getTemplate('500')
            .then((data) => {
                data = data.data.replace('%ERRORID%', error.errorId ? `Error ID: ${error.errorId}` : '');

                document.querySelector('html').innerHTML = data;

                this.#ilcAlreadyCrashed = true;
                window.dispatchEvent(new CustomEvent(IlcEvents.CRASH));
            })
            .catch((error) => {
                const fetchTemplateError = new FetchTemplateError({
                    message: 'Failed to get 500 error template',
                    cause: error,
                    data: {
                        fragmentErrorId: error.errorId,
                    },
                });

                this.#logger.error(fetchTemplateError.message, fetchTemplateError);
                alert('Something went wrong! Please try to reload page or contact support.');
            });
    }
}
