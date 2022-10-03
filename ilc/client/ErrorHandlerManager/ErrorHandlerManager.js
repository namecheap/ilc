import * as uuidv4 from 'uuid/v4';
import IlcEvents from '../constants/ilcEvents';
import defaultErrorTransformer from './defaultErrorTransformer';

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

    #registryConfig;

    #registryService;

    #errorTransformers;

    constructor(registryConfig, logger, registryService) {
        this.#logger = logger;
        this.#registryConfig = registryConfig;
        this.#registryService = registryService;
        this.#errorTransformers = [defaultErrorTransformer];
    }

    addErrorTransformer(handler) {
        this.#errorTransformers.push(handler);
    }

    internalError(error, errorInfo = {}) {
        this.#noticeError(error, {
            ...errorInfo,
            type: 'INTERNAL_ERROR',
        });
    }

    criticalInternalError(error, errorInfo = {}) {
        const errorId = uuidv4();

        this.#noticeError(error, {
            ...errorInfo,
            errorId,
            type: 'CRITICAL_INTERNAL_ERROR',
        });

        this.#crashIlc(errorId);
    }

    runtimeError(error, errorInfo = {}) {
        this.#noticeError(error, {
            ...errorInfo,
            type: 'MODULE_ERROR',
        });
    }

    fragmentError(error, errorInfo = {}) {      
        this.#noticeError(error, {
            ...errorInfo,
            type: 'FRAGMENT_ERROR',
        });
    }

    criticalFragmentError(error, errorInfo = {}) {
        const errorId = uuidv4();

        this.#noticeError(error, {
            ...errorInfo,
            errorId,
            type: 'CRITICAL_FRAGMENT_ERROR',
        });

        this.#crashIlc(errorId);
    }

    #crashIlc(errorId) {
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
                this.#noticeError(error, {
                    type: 'FETCH_PAGE_ERROR',
                    name: error.toString(),
                    fragmentErrorId: errorId,
                });

                alert('Something went wrong! Please try to reload page or contact support.');
            });
    }

    #runErrorTransformers(error, errorInfo = {}) {
        return this.#errorTransformers.reduce(({ error, errorInfo }, transformer) => {
            try {
                return transformer({
                    error,
                    errorInfo,
                    config: this.#registryConfig,
                });
            } catch(e) {
                this.#logger.error('Error transfromer failed to transform error', {
                    error: e,
                    originalError: error,
                });

                return { error, errorInfo };
            }
        }, { error, errorInfo });
    }

    #noticeError(error, errorInfo = {}) {
        // Ignoring all consequent errors after crash
        if (this.#ilcAlreadyCrashed) {
            this.#logger.info(`Ignoring error as we already crashed...\n${error.stack}`);
            return;
        }

        errorInfo = {
            errorId: uuidv4(),
            ...errorInfo,
        };

        if (error.data) {
            Object.assign(errorInfo, error.data);
        }

        const transformResult = this.#runErrorTransformers(error, errorInfo);
        error = transformResult.error;
        errorInfo = transformResult.errorInfo;

        // TODO: Move to logger abstraction
        if (window.newrelic && window.newrelic.noticeError && canBeSentToNewRelic(error)) {
            window.newrelic.noticeError(error, errorInfo);
        }
    
        this.#logger.error(JSON.stringify({
            type: error.name,
            message: error.message,
            stack: error.stack.split('\n'),
            additionalInfo: errorInfo,
        }), error);
    }
}
