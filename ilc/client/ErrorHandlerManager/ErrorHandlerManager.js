import IlcEvents from '../constants/ilcEvents';
import {
    BaseError,
    InternalError,
    FetchTemplateError,
    CriticalInternalError,
} from '../errors';

const msgRegexps = [
    /^Application '.+?' died in status LOADING_SOURCE_CODE: Failed to fetch$/
];

// The goal here is to ignore some errors that are "OK". And may happen due to conditions that we cannot change.
function canBeSentToNewRelic(err) {
    for (let regex of msgRegexps) {
        if (regex.test(err.message)) {
            return false;
        }
    }

    return true;
}

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
            error = new InternalError({
                cause: error,
            });
        }

        this.#noticeError(error);

        if (error instanceof CriticalInternalError) {
            this.#crashIlc(error);
        }
    }

    #crashIlc(error) {
        const { errorId } = error.data;

        if (this.#ilcAlreadyCrashed) {
            return;
        }

        this.#registryService.getTemplate('500')
            .then((data) => {
                data = data.data.replace('%ERRORID%', errorId ? `Error ID: ${errorId}` : '');

                document.querySelector('html').innerHTML = data;

                this.#ilcAlreadyCrashed = true;
                window.dispatchEvent(new CustomEvent(IlcEvents.CRASH));
            })
            .catch((error) => {
                const fetchTemplateError = new FetchTemplateError({
                    message: 'Failed to get 500 error template',
                    cause: error,
                    data: {
                        fragmentErrorId: errorId,
                    }
                });

                this.#noticeError(fetchTemplateError);

                alert('Something went wrong! Please try to reload page or contact support.');
            });
    }

    #noticeError(error) {
        // Ignoring all consequent errors after crash
        if (this.#ilcAlreadyCrashed) {
            this.#logger.info(`Ignoring error as we already crashed...\n${error.stack}`);
            return;
        }

        // TODO: Move to logger abstraction
        if (window.newrelic && window.newrelic.noticeError && canBeSentToNewRelic(error)) {
            window.newrelic.noticeError(error, error.data);
        }
    
        this.#logger.error(JSON.stringify({
            type: error.name,
            message: error.message,
            stack: error.stack.split('\n'),
            additionalInfo: error.data,
        }), error);
    }
}
