import * as uuidv4 from 'uuid/v4';

export class BaseError extends Error {

    data = {};

    errorId = uuidv4();
    
    static #codePattern = 'Error';

    constructor({ message, data, cause } = {}) {
        super(message);

        this.name = this.constructor.name;
       
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
            return BaseError.#convertCtorName(BaseError.prototype.constructor.name);
        }

        while ((prototypeValue !== BaseError.prototype && prototypeValue !== null)) {
            const lowerCaseCtorName = BaseError.#convertCtorName(prototypeValue.constructor.name);
            codeContainer.push(lowerCaseCtorName);
            prototypeValue = Reflect.getPrototypeOf(prototypeValue);
        }

        return codeContainer.reverse().join(codeSeparator);
    }

    static #convertCtorName(toLowerCase) {
        let ctorName = toLowerCase.charAt(0).toLowerCase() + toLowerCase.slice(1);

        if (ctorName.endsWith(this.#codePattern)) {
            ctorName = ctorName.slice(0, -Math.abs(this.#codePattern.length));
        }

        return ctorName;
    }
}
