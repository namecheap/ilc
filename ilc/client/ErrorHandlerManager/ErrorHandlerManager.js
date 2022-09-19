import * as uuidv4 from 'uuid/v4';

const System = window.System;

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
    
    #registryService;

    constructor(registryService) {
        this.#registryService = registryService;
        this.#preheat();
    }

    #preheat() {
        // Initializing 500 error page to cache template of this page
        // to avoid a situation when localhost can't return this template in future
        this.#registryService.preheat()
            .then(() => console.log('ILC: Registry service preheated successfully'))
            .catch((err) => {
                this.#noticeError(err);
            });
    }

    internalError(error, errorInfo = {}) {
        const errorId = uuidv4();

        this.#noticeError(error, {
            ...errorInfo,
            type: 'INTERNAL_ERROR',
            errorId,
        });

        this.#crashIlc(errorId);
    }

    runtimeError(event, errorInfo = {}) {
        const moduleInfo = System.getModuleInfo(event.filename);

        // TODO: Log error anycase with special attribute
        if (moduleInfo === null) {
            return;
        }

        event.preventDefault();

        this.#noticeError(event.error, {
            ...errorInfo,
            type: 'MODULE_ERROR',
            
            // TODO: Change name to appName
            moduleName: moduleInfo.name,

            // TODO: Put dependants app name
            dependants: moduleInfo.dependants,
            location: {
                fileName: event.filename,
                lineNo: event.lineno,
                colNo: event.colno,
            },
        });
    }

    fragmentError({ appName, slotName, fragmentKind } = fragmentInfo, error, errorInfo = {}) {      
        const errorId = uuidv4();

        this.#noticeError(error, {
            ...errorInfo,
            type: 'FRAGMENT_ERROR',
            appName,
            slotName,
            errorId,
        });

        const isEssentialOrPrimaryFragment = [
            FRAGMENT_KIND.primary,
            FRAGMENT_KIND.essential
        ].includes(fragmentKind);

        if (isEssentialOrPrimaryFragment) {
            this.#crashIlc(errorId);
        }
    }

    #crashIlc(errorId) {
        this.#registryService.getTemplate('500')
            .then((data) => {
                data = data.data.replace('%ERRORID%', errorId ? `Error ID: ${errorId}` : '');

                document.querySelector('html').innerHTML = data;
                
                this.#ilcAlreadyCrashed = true;
                window.dispatchEvent(new CustomEvent(ilcEvents.CRASH));
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

    #noticeError(error, errorInfo = {}) {
        // Ignoring all consequent errors after crash
        if (this.#ilcAlreadyCrashed) {
            console.info(`Ignoring error as we already crashed...\n${error.stack}`);
            return;
        }

        const infoData = {
            errorId: uuidv4(),
            ...errorInfo,
        };
        
        if (error.data) {
            Object.assign(infoData, error.data);
        }
    
        // TODO: Move to logger abstraction
        if (window.newrelic && window.newrelic.noticeError && canBeSentToNewRelic(error)) {
            window.newrelic.noticeError(error, infoData);
        }
    
        console.error(JSON.stringify({
            type: error.name,
            message: error.message,
            stack: error.stack.split("\n"),
            additionalInfo: infoData,
        }), error);
    }
}
