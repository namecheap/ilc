import { v4 as uuidv4 } from 'uuid';

export class BaseError extends Error {
    data = {};

    name = 'BaseError';

    errorId = uuidv4();

    static errorCode = 'base';

    static #codePattern = 'Error';

    static extend(name) {
        const child = {
            [name]: class extends this {
                name = name;
            },
        };

        child[name].setErrorCode(BaseError.#classNameToErrorCode(name));

        return child[name];
    }

    static setErrorCode(errorCode) {
        this.errorCode = errorCode;
    }

    constructor({ message, data, cause } = {}) {
        super(message);

        if (typeof data !== 'undefined') {
            this.data = data;
        }

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        if (cause) {
            this.cause = cause;
            this.stack = `${this.stack}\nCaused by: ${cause.stack || cause.toString()}`;
        }
    }

    get code() {
        const codeContainer = [];
        const codeSeparator = '.';
        let prototypeValue = Reflect.getPrototypeOf(this);

        if (prototypeValue === BaseError.prototype) {
            return BaseError.errorCode;
        }

        while (prototypeValue !== BaseError.prototype && prototypeValue !== null) {
            codeContainer.push(prototypeValue.constructor.errorCode);
            prototypeValue = Reflect.getPrototypeOf(prototypeValue);
        }

        return codeContainer.reverse().join(codeSeparator);
    }

    static #classNameToErrorCode(toLowerCase) {
        let errorCode = toLowerCase.charAt(0).toLowerCase() + toLowerCase.slice(1);

        if (errorCode.endsWith(this.#codePattern)) {
            errorCode = errorCode.slice(0, -Math.abs(this.#codePattern.length));
        }

        return errorCode;
    }
}
